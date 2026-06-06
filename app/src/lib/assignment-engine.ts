// ABOUTME: Evaluates assignment rules to decide which templates to send
// ABOUTME: Normalizes submissions and applies rule-based template selection

interface FilloutQuestion {
  id: string;
  questionId: string;
  title: string;
  name: string;
}

interface Submission {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  locationType: string | null;
  city: string | null;
  country: string | null;
  church: string | null;
  rawData: unknown;
}

export interface AssignmentRule {
  templateSlug: string;
  condition: (
    submission: NormalizedSubmission,
    answers: Record<string, unknown>,
  ) => boolean;
  reason: string;
}

export interface NormalizedSubmission {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  locationType: "romania" | "diaspora" | null;
  city: string | null;
  country: string | null;
  church: string | null;
  answers: Record<string, unknown>;
}

export interface AssignmentResult {
  templateSlug: string;
  reason: string;
  missingFields?: string[];
}

// Port of the Apps Script assignment logic
export class AssignmentEngine {
  private rules: AssignmentRule[];

  constructor() {
    this.rules = this.defineRules();
  }

  private defineRules(): AssignmentRule[] {
    return [
      {
        templateSlug: "info-rugaciune-pentru-grup-etnic",
        condition: (sub, answers) => {
          // Check if prayer_adoption indicates exclusion
          const prayerAdoption = this.getAnswerValue(answers, "prayer_adoption");
          if (prayerAdoption) {
            const prayerExclusions = ["nu"];
            if (this.isExcluded(prayerAdoption, prayerExclusions)) return false;
          }
          // Check if they want to adopt an ethnic group for prayer
          const prayerMethod = this.getAnswerValue(answers, "prayer_method");
          const ethnicGroupChoice = this.getAnswerValue(
            answers,
            "ethnic_group_choice",
          );
          return (
            (prayerMethod?.includes("adopt") ?? false) ||
            ethnicGroupChoice !== null
          );
        },
        reason: "User wants to adopt an ethnic group for prayer",
      },
      {
        templateSlug: "info-rugaciune-pentru-misionari",
        condition: (sub, answers) => {
          // Check if prayer_adoption indicates exclusion
          const prayerAdoption = this.getAnswerValue(answers, "prayer_adoption");
          if (prayerAdoption) {
            const prayerExclusions = ["nu"];
            if (this.isExcluded(prayerAdoption, prayerExclusions)) return false;
          }
          // Check if they want to pray for missionaries
          const prayerMethod = this.getAnswerValue(answers, "prayer_method");
          return prayerMethod?.includes("missionary") ?? false;
        },
        reason: "User wants to pray for missionaries",
      },
      {
        templateSlug: "info-misiune-pe-termen-scurt-apme",
        condition: (sub, answers) => {
          // Check interest in short-term missions
          const interests = this.getAnswerValue(answers, "mission_interests");
          return interests?.includes("short_term") ?? false;
        },
        reason: "User interested in short-term missions",
      },
      {
        templateSlug: "info-misiune-pe-termen-lung-apme",
        condition: (sub, answers) => {
          // Check if they want to become a missionary
          const role = this.getAnswerValue(answers, "desired_role");
          return role?.includes("missionary") ?? false;
        },
        reason: "User wants to become a missionary",
      },
      {
        templateSlug: "info-tabere-misiune-apme",
        condition: (sub, answers) => {
          // Check if camp_info indicates exclusion (past participant or not interested)
          const campInfo = this.getAnswerValue(answers, "camp_info");
          if (campInfo) {
            const campExclusions = [
              "nu sunt interesat/ă",
              "am participat, doresc să mai fiu informat și pe viitor"
            ];
            if (this.isExcluded(campInfo, campExclusions)) return false;
          }
          // Check interest in mission camps
          const interests = this.getAnswerValue(answers, "mission_interests");
          return interests?.includes("camps") ?? false;
        },
        reason: "User interested in mission camps",
      },
      {
        templateSlug: "info-voluntariat-apme",
        condition: (sub, answers) => {
          // Check interest in volunteering
          const interests = this.getAnswerValue(answers, "mission_interests");
          return interests?.includes("volunteer") ?? false;
        },
        reason: "User interested in volunteering",
      },
      {
        templateSlug: "info-donatii-apme",
        condition: (sub, answers) => {
          // Check interest in donations
          const interests = this.getAnswerValue(answers, "support_interests");
          return interests?.includes("donate") ?? false;
        },
        reason: "User interested in supporting financially",
      },
      {
        templateSlug: "info-despre-cursul-kairos",
        condition: (sub, answers) => {
          // Check interest in Kairos course
          const courses = this.getAnswerValue(answers, "course_interests");
          return courses?.includes("kairos") ?? false;
        },
        reason: "User interested in Kairos course",
      },
      {
        templateSlug: "info-despre-cursul-mobilizeaza",
        condition: (sub, answers) => {
          // Check interest in Mobilizeaza course
          const courses = this.getAnswerValue(answers, "course_interests");
          return courses?.includes("mobilizeaza") ?? false;
        },
        reason: "User interested in Mobilizeaza course",
      },
      {
        templateSlug: "info-crst",
        condition: (sub, answers) => {
          // Check interest in CRST
          const courses = this.getAnswerValue(answers, "course_interests");
          return courses?.includes("crst") ?? false;
        },
        reason: "User interested in CRST",
      },
    ];
  }

  private isExcluded(value: string | null, exclusions: string[]): boolean {
    if (!value) return false;
    return exclusions.includes(value.trim());
  }

  private getAnswerValue(
    answers: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = answers[key];
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.toLowerCase();
    if (Array.isArray(value)) return value.join(",").toLowerCase();
    return String(value).toLowerCase();
  }

  normalizeSubmission(
    submission: Submission & {
      answers: Array<{
        question: FilloutQuestion;
        value: string | null;
        rawValue: unknown;
      }>;
    },
  ): NormalizedSubmission {
    const answers: Record<string, unknown> = {};

    for (const answer of submission.answers) {
      // Try to map to canonical key if available
      const key = answer.question.name.toLowerCase().replace(/\s+/g, "_");
      answers[key] = answer.rawValue;
    }

    return {
      id: submission.id,
      email: submission.email,
      firstName: submission.firstName,
      lastName: submission.lastName,
      locationType: submission.locationType as "romania" | "diaspora" | null,
      city: submission.city,
      country: submission.country,
      church: submission.church,
      answers,
    };
  }

  assignTemplates(submission: NormalizedSubmission): AssignmentResult[] {
    const results: AssignmentResult[] = [];

    for (const rule of this.rules) {
      try {
        const matches = rule.condition(submission, submission.answers);

        if (matches) {
          results.push({
            templateSlug: rule.templateSlug,
            reason: rule.reason,
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.templateSlug}:`, error);
      }
    }

    return results;
  }

  // Location alone should not assign templates unless matching templates exist in the catalog.
  getLocationSpecificTemplates(locationType: string | null): string[] {
    void locationType;
    return [];
  }
}

// Singleton instance
export const assignmentEngine = new AssignmentEngine();
