// ABOUTME: Imports submission records from CSV into the database
// ABOUTME: Provides GET preview and POST import endpoints for legacy submissions
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAssignmentsForSubmission } from "@/lib/assignments";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const dataDir = path.join(process.cwd(), "..", "docs", "data");

interface CSVRow {
  "Submission ID": string;
  "Submission time": string;
  "Cum te numești?": string;
  "Număr de telefon": string;
  Email: string;
  "Căți ani ai?": string;
  "Unde locuiești?": string;
  "În ce oraș din România locuiești?": string;
  "În ce oraș și țară locuiești?": string;
  "La ce biserică mergi?": string;
  "Processing Status"?: string;
  "Processed At"?: string;
  [key: string]: string | undefined;
}

const CSV_META_FIELDS = new Set(["Processing Status", "Processed At"]);

const CSV_QUESTION_IDS: Record<string, string> = {
  "Submission ID": "submission_id",
  "Submission time": "submission_time",
  "Cum te numești?": "full_name",
  "Număr de telefon": "phone",
  Email: "email",
  "Căți ani ai?": "age",
  "Unde locuiești?": "location",
  "În ce oraș din România locuiești?": "city_romania",
  "În ce oraș și țară locuiești?": "city_international",
  "La ce biserică mergi?": "church",
  "Cum ai ajuns să completezi acest formular": "source_context",
  "Cum ai vrea să te rogi mai mult pentru misiune": "prayer_method_raw",
  "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?":
    "prayer_adoption",
  "Pentru ce misionar vrei să te rogi?": "missionary_choice",
  "Cât timp vrei să te rogi, săptămânal, pentru  @":
    "missionary_prayer_time",
  "Pentru care popor neatins vrei să te rogi?": "ethnic_group_choice_raw",
  "Cât timp vrei să te rogi, săptămânal, pentru": "ethnic_group_prayer_time",
  "Vrei să primești informații despre taberele de misiune APME?":
    "camp_interest",
  "Dorești să te implici ca voluntar APME?": "volunteer_interest",
  "Dorești să ajuți financiar lucrările și misionarii APME?":
    "financial_support",
  "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
    "mission_field_interest",
  "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
    "course_interests_raw",
  "Dorești mai multe informații despre CRST (școala de misiune de la Agigea, CT) ?":
    "crst_interest",
  "Alte observatii": "observations",
  GDPR: "gdpr_consent",
  "În ce poziție de voluntariat vrei să te implici?": "volunteer_position",
};

interface CsvAnswerInput {
  questionId: string;
  value: string | null;
  rawValue: string | string[];
}

const CANONICAL_DECISION_QUESTIONS = [
  "mission_interests",
  "course_interests",
  "support_interests",
  "prayer_method",
  "ethnic_group_choice",
  "desired_role",
];

export function getCsvQuestionId(header: string): string {
  const mapped = CSV_QUESTION_IDS[header];
  if (mapped) return mapped;

  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export function buildCsvAnswerInputs(
  row: CSVRow,
  questionIdByHeader: Record<string, string>,
): CsvAnswerInput[] {
  return Object.entries(row)
    .filter(([header, value]) => !CSV_META_FIELDS.has(header) && value)
    .map(([header, value]) => ({
      questionId: questionIdByHeader[header],
      value: value ?? null,
      rawValue: value ?? "",
    }))
    .filter((answer) => Boolean(answer.questionId));
}

export function hasPositiveIntent(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  if (!normalized || normalized.includes("nu sunt interesat")) return false;
  if (normalized === "nu") return false;
  if (normalized.includes("am participat, doresc să mai fiu informat"))
    return false;
  if (normalized.includes("nu acum, poate mai târziu")) return false;
  if (normalized.includes("nu am resurse financiare")) return false;
  return normalized.includes("da") || normalized.length > 0;
}

export function isStrictBooleanTrue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toString().trim().toUpperCase();
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildAssignmentAnswersFromCsvRow(row: CSVRow) {
  const answers: Array<{
    questionId: string;
    value: string | null;
    rawValue: string | string[];
  }> = [];
  const missionInterests: string[] = [];
  const courseInterests: string[] = [];
  const prayerMethods: string[] = [];

  const missionField = row[
    "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?"
  ];
  if (hasPositiveIntent(missionField)) {
    const normalized = missionField?.toLowerCase() ?? "";
    if (normalized.includes("termen scurt")) missionInterests.push("short_term");
    if (normalized.includes("termen lung")) {
      answers.push({
        questionId: "desired_role",
        value: missionField ?? null,
        rawValue: "missionary",
      });
    }
  }

  const campInfo = row["Vrei să primești informații despre taberele de misiune APME?"];
  if (hasPositiveIntent(campInfo)) missionInterests.push("camps");

  const volunteer = row["Dorești să te implici ca voluntar APME?"];
  if (isStrictBooleanTrue(volunteer)) missionInterests.push("volunteer");

  const donation = row[
    "Dorești să ajuți financiar lucrările și misionarii APME?"
  ];
  if (isStrictBooleanTrue(donation)) {
    answers.push({
      questionId: "support_interests",
      value: donation ?? null,
      rawValue: ["donate"],
    });
  }

  const courses = row[
    "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?"
  ];
  if (hasPositiveIntent(courses)) {
    const normalized = (courses ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalized.includes("kairos")) courseInterests.push("kairos");
    if (normalized.includes("mobilize") || normalized.includes("imputernicit")) courseInterests.push("mobilizeaza");
    if (normalized.includes("crst")) courseInterests.push("crst");
  }

  const prayerAdoption = row["Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?"];
  if (hasPositiveIntent(prayerAdoption)) {
    const missionaryChoice = row["Pentru ce misionar vrei să te rogi?"];
    if (hasPositiveIntent(missionaryChoice)) prayerMethods.push("missionary");

    const ethnicGroupChoice = row["Pentru care popor neatins vrei să te rogi?"];
    if (hasPositiveIntent(ethnicGroupChoice)) {
      prayerMethods.push("adopt");
      answers.push({
        questionId: "ethnic_group_choice",
        value: ethnicGroupChoice ?? null,
        rawValue: ethnicGroupChoice ?? "",
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

export function buildCanonicalDecisionAnswerInputs(
  row: CSVRow,
  questionIdByCanonicalKey: Record<string, string>,
): CsvAnswerInput[] {
  return buildAssignmentAnswersFromCsvRow(row)
    .map((answer) => ({
      questionId: questionIdByCanonicalKey[answer.questionId],
      value: answer.value,
      rawValue: answer.rawValue,
    }))
    .filter((answer) => Boolean(answer.questionId));
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseLocation(row: CSVRow): {
  city: string;
  country: string;
  locationType: string;
} {
  const romaniaCity = row["În ce oraș din România locuiești?"]?.trim();
  const diasporaLocation = row["În ce oraș și țară locuiești?"]?.trim();
  const whereTheyLive = row["Unde locuiești?"]?.trim();

  if (romaniaCity) {
    return { city: romaniaCity, country: "România", locationType: "romania" };
  }

  if (diasporaLocation) {
    // Parse "City, Country" format
    const parts = diasporaLocation.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[parts.length - 1],
        locationType: "diaspora",
      };
    }
    return { city: diasporaLocation, country: "", locationType: "diaspora" };
  }

  if (whereTheyLive?.includes("Diaspora")) {
    return { city: "", country: "", locationType: "diaspora" };
  }

  return { city: "", country: "", locationType: "romania" };
}

export function parseProcessingStatus(row: CSVRow): {
  status: "pending" | "processed";
  processedAt: Date | null;
} {
  const processingStatus = row["Processing Status"]?.trim().toUpperCase();

  if (processingStatus !== "PROCESSED") {
    return {
      status: "pending",
      processedAt: null,
    };
  }

  const processedAtRaw = row["Processed At"]?.trim();
  if (processedAtRaw) {
    const parsedDate = new Date(processedAtRaw);
    if (!Number.isNaN(parsedDate.getTime())) {
      return {
        status: "processed",
        processedAt: parsedDate,
      };
    }
  }

  return {
    status: "processed",
    processedAt: new Date(),
  };
}

export async function POST(request: NextRequest) {
  try {
    void request;
    const csvPath = path.join(dataDir, "implicare-data.csv");

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: "CSV file not found" },
        { status: 404 },
      );
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
    }) as CSVRow[];

    const results = {
      imported: 0,
      skipped: 0,
      answersImported: 0,
      assignmentsCreated: 0,
      assignmentsSkipped: 0,
      errors: [] as string[],
    };

    // Get or create a default form
    let form = await prisma.filloutForm.findFirst();

    if (!form) {
      form = await prisma.filloutForm.create({
        data: {
          formId: "implicare-form",
          name: "Implicare Form",
          status: "active",
        },
      });
    }

    const csvHeaders = Object.keys(records[0] ?? {}).filter(
      (header) => !CSV_META_FIELDS.has(header),
    );
    const questionIdByHeader: Record<string, string> = {};

    for (const header of csvHeaders) {
      const question = await prisma.filloutQuestion.upsert({
        where: {
          questionId_formId: {
            questionId: getCsvQuestionId(header),
            formId: form.id,
          },
        },
        update: {
          name: header,
          type: "csv",
        },
        create: {
          questionId: getCsvQuestionId(header),
          formId: form.id,
          name: header,
          type: "csv",
          order: csvHeaders.indexOf(header),
        },
      });

      questionIdByHeader[header] = question.id;
    }

    const questionIdByCanonicalKey: Record<string, string> = {};
    for (const canonicalKey of CANONICAL_DECISION_QUESTIONS) {
      const question = await prisma.filloutQuestion.upsert({
        where: {
          questionId_formId: {
            questionId: canonicalKey,
            formId: form.id,
          },
        },
        update: {
          name: canonicalKey,
          type: "canonical_decision",
        },
        create: {
          questionId: canonicalKey,
          formId: form.id,
          name: canonicalKey,
          type: "canonical_decision",
          order: csvHeaders.length + CANONICAL_DECISION_QUESTIONS.indexOf(canonicalKey),
        },
      });

      questionIdByCanonicalKey[canonicalKey] = question.id;
    }

    for (const row of records) {
      try {
        const submissionId = row["Submission ID"];
        const { status, processedAt } = parseProcessingStatus(row);

        if (!submissionId) {
          results.skipped++;
          continue;
        }

        // Check if already exists
        const existing = await prisma.submission.findUnique({
          where: { submissionId: submissionId },
        });

        if (existing) {
          await prisma.submission.update({
            where: { id: existing.id },
            data: {
              status,
              processedAt,
            },
          });

          await prisma.submissionAnswer.deleteMany({
            where: { submissionId: existing.id },
          });

          const answerInputs = [
            ...buildCsvAnswerInputs(row, questionIdByHeader),
            ...buildCanonicalDecisionAnswerInputs(row, questionIdByCanonicalKey),
          ];
          for (const answer of answerInputs) {
            await prisma.submissionAnswer.create({
              data: {
                submissionId: existing.id,
                questionId: answer.questionId,
                value: answer.value,
                rawValue: answer.rawValue,
              },
            });
          }
          results.answersImported += answerInputs.length;

          const assignmentResult = await createAssignmentsForSubmission(
            existing.id,
            {
              submissionId,
              submissionTime: existing.submissionTime,
              email: existing.email,
              firstName: existing.firstName,
              lastName: existing.lastName,
              phone: existing.phone,
              locationType: existing.locationType as "romania" | "diaspora" | null,
              city: existing.city,
              country: existing.country,
              church: existing.church,
              rawData: {
                submissionId,
                submissionTime: existing.submissionTime.toISOString(),
                questions: [],
              },
              answers: buildAssignmentAnswersFromCsvRow(row),
            },
            { queueSendJobs: false },
          );
          results.assignmentsCreated += assignmentResult.created;
          results.assignmentsSkipped += assignmentResult.skipped;
          results.errors.push(...assignmentResult.errors);

          results.skipped++;
          continue;
        }

        const { firstName, lastName } = parseName(row["Cum te numești?"] || "");
        const { city, country, locationType } = parseLocation(row);

        // Parse submission time
        let submissionTime: Date;
        try {
          submissionTime = new Date(row["Submission time"]);
          if (isNaN(submissionTime.getTime())) {
            submissionTime = new Date();
          }
        } catch {
          submissionTime = new Date();
        }

        // Build raw data object with all fields
        const rawData: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value) {
            rawData[key] = value;
          }
        }

        const submission = await prisma.submission.create({
          data: {
            submissionId: submissionId,
            formId: form.id,
            submissionTime: submissionTime,
            firstName,
            lastName,
            email: row["Email"] || null,
            phone: row["Număr de telefon"] || null,
            locationType,
            city,
            country,
            church: row["La ce biserică mergi?"] || null,
            rawData,
            status,
            processedAt,
          },
        });

        const answerInputs = [
          ...buildCsvAnswerInputs(row, questionIdByHeader),
          ...buildCanonicalDecisionAnswerInputs(row, questionIdByCanonicalKey),
        ];
        for (const answer of answerInputs) {
          await prisma.submissionAnswer.create({
            data: {
              submissionId: submission.id,
              questionId: answer.questionId,
              value: answer.value,
              rawValue: answer.rawValue,
            },
          });
        }
        results.answersImported += answerInputs.length;

        const assignmentResult = await createAssignmentsForSubmission(
          submission.id,
          {
            submissionId,
            submissionTime,
            email: row["Email"] || null,
            firstName,
            lastName,
            phone: row["Număr de telefon"] || null,
            locationType: locationType as "romania" | "diaspora" | null,
            city,
            country,
            church: row["La ce biserică mergi?"] || null,
            rawData: {
              submissionId,
              submissionTime: submissionTime.toISOString(),
              questions: [],
            },
            answers: buildAssignmentAnswersFromCsvRow(row),
          },
          { queueSendJobs: false },
        );
        results.assignmentsCreated += assignmentResult.created;
        results.assignmentsSkipped += assignmentResult.skipped;
        results.errors.push(...assignmentResult.errors);

        results.imported++;
      } catch (error) {
        results.errors.push(
          `Failed to import ${row["Submission ID"]}: ${error}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} submissions, skipped ${results.skipped} existing submissions`,
    });
  } catch (error) {
    console.error("Error importing submissions:", error);
    return NextResponse.json(
      { error: "Failed to import submissions" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    void request;
    const csvPath = path.join(dataDir, "implicare-data.csv");

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: "CSV file not found" },
        { status: 404 },
      );
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
    }) as CSVRow[];

    return NextResponse.json({
      count: records.length,
      sample: records.slice(0, 3).map((r) => ({
        id: r["Submission ID"],
        name: r["Cum te numești?"],
        email: r["Email"],
      })),
    });
  } catch (error) {
    console.error("Error listing submissions:", error);
    return NextResponse.json(
      { error: "Failed to list submissions" },
      { status: 500 },
    );
  }
}
