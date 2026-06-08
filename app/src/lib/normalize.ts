// ABOUTME: Normalizes Fillout submissions into canonical data structures
// ABOUTME: Extracts location, contact, and mapped field values for storage
import type {
  FilloutSubmission,
  NormalizedSubmission,
  FieldValue,
} from "@/types/fillout";

interface FieldMapping {
  id: string;
  questionId: string;
  canonicalKey: string;
  [key: string]: unknown;
}

interface FilloutQuestion {
  id: string;
  questionId: string;
  [key: string]: unknown;
}

export function detectLocationType(
  answers: FilloutSubmission["questions"],
): "romania" | "diaspora" | null {
  const locationAnswer = answers.find(
    (a) => a.name?.includes("locuiești") || a.name?.includes("Unde locuiești"),
  );

  if (!locationAnswer?.value) return null;

  const value = String(locationAnswer.value).toLowerCase();

  if (value.includes("românia") || value.includes("romania")) {
    return "romania";
  } else if (value.includes("în afara româniei") || value.includes("afara")) {
    return "diaspora";
  }

  return null;
}

export function extractName(fullName: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName) return { firstName: null, lastName: null };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function extractCityAndCountry(
  locationType: "romania" | "diaspora" | null,
  answers: FilloutSubmission["questions"],
): { city: string | null; country: string | null } {
  if (locationType === "romania") {
    const cityAnswer = answers.find((a) =>
      a.name?.includes("oraș din România"),
    );
    return {
      city: cityAnswer?.value ? String(cityAnswer.value) : null,
      country: "Romania",
    };
  }

  if (locationType === "diaspora") {
    const cityAnswer = answers.find((a) => a.name?.includes("oraș și țară"));
    if (cityAnswer?.value) {
      const value = String(cityAnswer.value);
      const parts = value.split(/,\s*/);
      return {
        city: parts[0] || null,
        country: parts[1] || null,
      };
    }
  }

  return { city: null, country: null };
}

export function normalizeSubmission(
  submission: FilloutSubmission,
): NormalizedSubmission {
  const locationType = detectLocationType(submission.questions);
  const { city, country } = extractCityAndCountry(
    locationType,
    submission.questions,
  );

  // Try to find name from various fields
  const nameAnswer = submission.questions.find(
    (a) =>
      a.name?.includes("numești") || a.name?.toLowerCase().includes("name"),
  );
  const { firstName, lastName } = extractName(
    nameAnswer?.value ? String(nameAnswer.value) : null,
  );

  // Try to find email
  const emailAnswer = submission.questions.find(
    (a) => a.name?.toLowerCase().includes("email") || a.type === "EmailInput",
  );

  // Try to find phone
  const phoneAnswer = submission.questions.find(
    (a) => a.name?.includes("telefon") || a.type === "PhoneNumber",
  );

  // Try to find church
  const churchAnswer = submission.questions.find((a) =>
    a.name?.includes("biserică"),
  );

  return {
    submissionId: submission.submissionId,
    submissionTime: new Date(submission.submissionTime),
    email: emailAnswer?.value ? String(emailAnswer.value) : null,
    firstName,
    lastName,
    phone: phoneAnswer?.value ? String(phoneAnswer.value) : null,
    locationType,
    city,
    country,
    church: churchAnswer?.value ? String(churchAnswer.value) : null,
    rawData: submission,
    answers: [
      ...submission.questions.map((q) => ({
        questionId: q.id,
        value: q.value ? String(q.value) : null,
        rawValue: q.value,
      })),
      ...buildCanonicalAssignmentAnswersFromQuestions(submission.questions),
    ],
  };
}

export function buildCanonicalAssignmentAnswersFromQuestions(
  questions: FilloutSubmission["questions"],
): NormalizedSubmission["answers"] {
  const answers: NormalizedSubmission["answers"] = [];
  const missionInterests: string[] = [];
  const courseInterests: string[] = [];
  const prayerMethods: string[] = [];

  const answerByName = (matcher: (name: string) => boolean) =>
    questions.find((question) => matcher(normalizeText(question.name)))?.value;

  const missionField = answerByName((name) =>
    name.includes("oportunitatile de a merge pe campul de misiune"),
  );
  if (hasPositiveIntent(missionField)) {
    const normalized = normalizeText(missionField);
    if (normalized.includes("termen scurt")) missionInterests.push("short_term");
    if (normalized.includes("termen lung")) {
      answers.push({
        questionId: "desired_role",
        value: String(missionField),
        rawValue: "missionary",
      });
    }
  }

  const campInfo = answerByName((name) =>
    name.includes("informatii despre taberele de misiune"),
  );
  if (hasPositiveIntent(campInfo)) missionInterests.push("camps");

  const volunteer = answerByName((name) => name.includes("voluntar"));
  if (hasPositiveIntent(volunteer)) missionInterests.push("volunteer");

  const donation = answerByName((name) =>
    name.includes("ajuti financiar lucrarile si misionarii"),
  );
  if (hasPositiveIntent(donation)) {
    answers.push({
      questionId: "support_interests",
      value: String(donation),
      rawValue: ["donate"],
    });
  }

  const courses = answerByName((name) =>
    name.includes("cursuri de pregatire"),
  );
  if (hasPositiveIntent(courses)) {
    const normalized = normalizeText(courses);
    if (normalized.includes("kairos")) courseInterests.push("kairos");
    if (normalized.includes("mobilize") || normalized.includes("imputernicit")) {
      courseInterests.push("mobilizeaza");
    }
    if (normalized.includes("crst")) courseInterests.push("crst");
  }

  const prayerAdoption = answerByName((name) =>
    name.includes("adopti in rugaciune"),
  );
  if (hasPositiveIntent(prayerAdoption)) {
    const missionaryChoice = answerByName((name) =>
      name.includes("pentru ce misionar"),
    );
    if (hasPositiveIntent(missionaryChoice)) prayerMethods.push("missionary");

    const ethnicGroupChoice = answerByName((name) =>
      name.includes("pentru care popor neatins"),
    );
    if (hasPositiveIntent(ethnicGroupChoice)) {
      prayerMethods.push("adopt");
      answers.push({
        questionId: "ethnic_group_choice",
        value: String(ethnicGroupChoice),
        rawValue: ethnicGroupChoice,
      });
    }
  }

  if (missionInterests.length > 0) {
    answers.push({
      questionId: "mission_interests",
      value: uniqueValues(missionInterests).join(","),
      rawValue: uniqueValues(missionInterests),
    });
  }

  if (courseInterests.length > 0) {
    answers.push({
      questionId: "course_interests",
      value: uniqueValues(courseInterests).join(","),
      rawValue: uniqueValues(courseInterests),
    });
  }

  if (prayerMethods.length > 0) {
    answers.push({
      questionId: "prayer_method",
      value: uniqueValues(prayerMethods).join(","),
      rawValue: uniqueValues(prayerMethods),
    });
  }

  return answers;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasPositiveIntent(value: unknown): boolean {
  const normalized = normalizeText(value);
  if (!normalized || normalized.includes("nu sunt interesat")) return false;
  if (normalized === "nu") return false;
  if (normalized.includes("am participat, doresc sa mai fiu informat")) {
    return false;
  }
  if (normalized.includes("nu acum, poate mai tarziu")) return false;
  if (normalized.includes("nu am resurse financiare")) return false;
  return normalized.includes("da") || normalized.length > 0;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

export function mapFieldValues(
  submission: FilloutSubmission,
  mappings: FieldMapping[],
  questions: FilloutQuestion[],
): FieldValue[] {
  const questionMap = new Map(questions.map((q) => [q.questionId, q]));
  const answerMap = new Map(submission.questions.map((a) => [a.id, a]));

  return mappings.map((mapping) => {
    const question = questionMap.get(mapping.questionId);
    const answer = question ? answerMap.get(question.id) : undefined;

    return {
      canonicalKey: mapping.canonicalKey,
      value: answer?.value ? String(answer.value) : null,
      rawValue: answer?.value ?? null,
    };
  });
}

export function booleanFromString(
  value: string | null | undefined,
): boolean | null {
  if (!value) return null;
  const normalized = value.toString().toUpperCase().trim();
  if (normalized === "TRUE" || normalized === "1" || normalized === "YES")
    return true;
  if (normalized === "FALSE" || normalized === "0" || normalized === "NO")
    return false;
  return null;
}
