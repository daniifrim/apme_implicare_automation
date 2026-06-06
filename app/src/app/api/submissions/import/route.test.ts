import fs from "fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAssignmentsForSubmission } from "@/lib/assignments";
import { prisma } from "@/lib/prisma";

import {
  POST,
  buildAssignmentAnswersFromCsvRow,
  buildCanonicalDecisionAnswerInputs,
  buildCsvAnswerInputs,
  getCsvQuestionId,
  hasPositiveIntent,
  parseProcessingStatus,
} from "./route";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock("@/lib/assignments", () => ({
  createAssignmentsForSubmission: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    filloutForm: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    filloutQuestion: {
      upsert: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    submissionAnswer: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

type RowInput = Parameters<typeof parseProcessingStatus>[0];

function createRow(overrides: Partial<RowInput> = {}): RowInput {
  return {
    "Submission ID": "sub-1",
    "Submission time": "5/28/2025 6:42:42",
    "Cum te numești?": "Test User",
    "Număr de telefon": "+40123456789",
    Email: "test@example.com",
    "Căți ani ai?": "30",
    "Unde locuiești?": "În România",
    "În ce oraș din România locuiești?": "Cluj-Napoca",
    "În ce oraș și țară locuiești?": "",
    "La ce biserică mergi?": "Test Church",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
    created: 1,
    skipped: 0,
    errors: [],
  });
});

describe("CSV import helpers", () => {
  it("creates stable question IDs and answer inputs for CSV fields", () => {
    const row = createRow({
      "Dorești să te implici ca voluntar APME?": "Da",
      "Processing Status": "PROCESSED",
    });

    const answers = buildCsvAnswerInputs(row, {
      "Dorești să te implici ca voluntar APME?": "question-volunteer",
      Email: "question-email",
    });

    expect(getCsvQuestionId("Dorești să te implici ca voluntar APME?")).toBe(
      "volunteer_interest",
    );
    expect(answers).toEqual(
      expect.arrayContaining([
        {
          questionId: "question-volunteer",
          value: "Da",
          rawValue: "Da",
        },
        {
          questionId: "question-email",
          value: "test@example.com",
          rawValue: "test@example.com",
        },
      ]),
    );
    expect(answers.some((answer) => answer.value === "PROCESSED")).toBe(false);
  });

  it("maps Romanian CSV decisions into canonical assignment answers", () => {
    const answers = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?": "Da",
        "Pentru ce misionar vrei să te rogi?": "Familia Popescu",
        "Pentru care popor neatins vrei să te rogi?": "Afgani",
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
        "Vrei să primești informații despre taberele de misiune APME?": "Da",
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Da, pe termen scurt (2-4 săptămâni)",
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Kairos, Mobilizează",
      }),
    );

    expect(answers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "prayer_method",
          rawValue: expect.arrayContaining(["missionary", "adopt"]),
        }),
        expect.objectContaining({
          questionId: "ethnic_group_choice",
          rawValue: "Afgani",
        }),
        expect.objectContaining({
          questionId: "support_interests",
          rawValue: ["donate"],
        }),
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: expect.arrayContaining(["short_term", "camps"]),
        }),
        expect.objectContaining({
          questionId: "course_interests",
          rawValue: expect.arrayContaining(["kairos", "mobilizeaza"]),
        }),
      ]),
    );
  });

  it("should not create prayer_method when prayer_adoption is NU", () => {
    const answers = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?": "NU",
        "Pentru ce misionar vrei să te rogi?": "Familia Popescu",
        "Pentru care popor neatins vrei să te rogi?": "Afgani",
      }),
    );

    expect(answers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "prayer_method",
        }),
      ]),
    );
  });

  it("should exclude negative mission-field answers from mission_interests", () => {
    const excluded = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Nu acum, poate mai târziu",
      }),
    );
    expect(excluded).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
        }),
      ]),
    );

    const excluded2 = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Nu am resurse financiare",
      }),
    );
    expect(excluded2).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
        }),
      ]),
    );

    const positive = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Da, pe termen scurt (2-4 săptămâni)",
      }),
    );
    expect(positive).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: expect.arrayContaining(["short_term"]),
        }),
      ]),
    );
  });

  it("should only create support_interests for exact boolean true/TRUE", () => {
    const withTrue = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
      }),
    );
    expect(withTrue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "support_interests",
          rawValue: ["donate"],
        }),
      ]),
    );

    const withDa = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să ajuți financiar lucrările și misionarii APME?": "Da",
      }),
    );
    expect(withDa).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "support_interests",
        }),
      ]),
    );

    const withNu = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să ajuți financiar lucrările și misionarii APME?": "Nu",
      }),
    );
    expect(withNu).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "support_interests",
        }),
      ]),
    );
  });

  it("should only create volunteer interest for exact boolean true/TRUE", () => {
    const withTrue = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să te implici ca voluntar APME?": "TRUE",
      }),
    );
    expect(withTrue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: expect.arrayContaining(["volunteer"]),
        }),
      ]),
    );

    const withDa = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să te implici ca voluntar APME?": "Da",
      }),
    );
    expect(withDa).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: expect.arrayContaining(["volunteer"]),
        }),
      ]),
    );

    const withNu = buildAssignmentAnswersFromCsvRow(
      createRow({
        "Dorești să te implici ca voluntar APME?": "Nu",
      }),
    );
    expect(withNu).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: expect.arrayContaining(["volunteer"]),
        }),
      ]),
    );
  });

  it("creates persistable canonical decision answer inputs for replay", () => {
    const answers = buildCanonicalDecisionAnswerInputs(
      createRow({
        "Dorești să te implici ca voluntar APME?": "TRUE",
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
      }),
      {
        mission_interests: "question-mission-interests",
        support_interests: "question-support-interests",
      },
    );

    expect(answers).toEqual(
      expect.arrayContaining([
        {
          questionId: "question-mission-interests",
          value: "volunteer",
          rawValue: ["volunteer"],
        },
        {
          questionId: "question-support-interests",
          value: "TRUE",
          rawValue: ["donate"],
        },
      ]),
    );
  });
});

describe("POST /api/submissions/import", () => {
  const csv = [
    "Submission ID,Submission time,Cum te numești?,Număr de telefon,Email,Căți ani ai?,Unde locuiești?,În ce oraș din România locuiești?,În ce oraș și țară locuiești?,La ce biserică mergi?,Dorești să te implici ca voluntar APME?,Processing Status,Processed At",
    "sub-1,2025-05-28T06:42:42.000Z,Ana Popescu,+40123456789,ana@example.com,30,În România,Cluj,,Betania,TRUE,PROCESSED,2025-05-28T07:00:00.000Z",
  ].join("\n");

  function mockFormAndQuestions() {
    vi.mocked(prisma.filloutForm.findFirst).mockResolvedValue({
      id: "form-1",
      formId: "implicare-form",
      name: "Implicare Form",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.filloutQuestion.upsert).mockImplementation(
      async ({ create }) =>
        ({
          id: `db-${create.questionId}`,
          questionId: create.questionId,
          formId: create.formId,
          type: create.type,
          name: create.name,
          order: create.order ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as never,
    );
  }

  it("persists CSV questions, answers, and assignment creation on first import", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(csv);
    mockFormAndQuestions();
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.submission.create).mockResolvedValue({
      id: "submission-db-1",
      submissionId: "sub-1",
    } as never);

    const response = await POST(new Request("http://localhost/api/submissions/import") as never);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(prisma.filloutQuestion.upsert).toHaveBeenCalled();
    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "sub-1",
          email: "ana@example.com",
          firstName: "Ana",
          lastName: "Popescu",
        }),
      }),
    );
    expect(prisma.submissionAnswer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "submission-db-1",
          questionId: "db-volunteer_interest",
          value: "TRUE",
          rawValue: "TRUE",
        }),
      }),
    );
    expect(prisma.submissionAnswer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "submission-db-1",
          questionId: "db-mission_interests",
          value: "volunteer",
          rawValue: ["volunteer"],
        }),
      }),
    );
    expect(createAssignmentsForSubmission).toHaveBeenCalledWith(
      "submission-db-1",
      expect.objectContaining({
        answers: expect.arrayContaining([
          expect.objectContaining({
            questionId: "mission_interests",
            rawValue: ["volunteer"],
          }),
        ]),
      }),
    );
    expect(body.results.answersImported).toBeGreaterThan(0);
    expect(body.results.assignmentsCreated).toBe(1);
  });

  it("recreates answers and reprocesses assignments on idempotent re-run", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(csv);
    mockFormAndQuestions();
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      id: "existing-submission",
      submissionId: "sub-1",
      submissionTime: new Date("2025-05-28T06:42:42.000Z"),
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      phone: "+40123456789",
      locationType: "romania",
      city: "Cluj",
      country: "România",
      church: "Betania",
    } as never);
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
      created: 0,
      skipped: 1,
      errors: [],
    });

    const response = await POST(new Request("http://localhost/api/submissions/import") as never);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(prisma.submission.update).toHaveBeenCalled();
    expect(prisma.submissionAnswer.deleteMany).toHaveBeenCalledWith({
      where: { submissionId: "existing-submission" },
    });
    expect(prisma.submissionAnswer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ submissionId: "existing-submission" }),
      }),
    );
    expect(createAssignmentsForSubmission).toHaveBeenCalledWith(
      "existing-submission",
      expect.objectContaining({
        answers: expect.arrayContaining([
          expect.objectContaining({ questionId: "mission_interests" }),
        ]),
      }),
    );
    expect(body.results.assignmentsSkipped).toBe(1);
  });
});

describe("hasPositiveIntent", () => {
  it("should exclude camp interest for past participants", () => {
    const result = hasPositiveIntent(
      "Am participat, doresc să mai fiu informat și pe viitor",
    );
    expect(result).toBe(false);
  });

  it("should treat 'Nu am participat, doresc informații' as positive intent", () => {
    const result = hasPositiveIntent("Nu am participat, doresc informații");
    expect(result).toBe(true);
  });

  it("should exclude mission-field negative answers", () => {
    expect(hasPositiveIntent("Nu acum, poate mai târziu")).toBe(false);
    expect(hasPositiveIntent("Nu am resurse financiare")).toBe(false);
  });
});

describe("parseProcessingStatus", () => {
  it("returns processed status for PROCESSED values", () => {
    const result = parseProcessingStatus(
      createRow({ "Processing Status": "PROCESSED" }),
    );

    expect(result.status).toBe("processed");
    expect(result.processedAt).not.toBeNull();
  });

  it("returns pending status for empty status values", () => {
    const result = parseProcessingStatus(
      createRow({ "Processing Status": "" }),
    );

    expect(result.status).toBe("pending");
    expect(result.processedAt).toBeNull();
  });

  it("parses valid Processed At date when provided", () => {
    const result = parseProcessingStatus(
      createRow({
        "Processing Status": "PROCESSED",
        "Processed At": "2025-05-28T06:42:42.000Z",
      }),
    );

    expect(result.status).toBe("processed");
    expect(result.processedAt?.toISOString()).toBe("2025-05-28T06:42:42.000Z");
  });

  it("falls back to now when Processed At is invalid", () => {
    const before = Date.now();
    const result = parseProcessingStatus(
      createRow({
        "Processing Status": "PROCESSED",
        "Processed At": "invalid-date",
      }),
    );
    const after = Date.now();

    expect(result.status).toBe("processed");
    expect(result.processedAt).not.toBeNull();
    expect(result.processedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.processedAt!.getTime()).toBeLessThanOrEqual(after);
  });
});
