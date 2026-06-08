import { describe, it, expect, beforeEach, vi } from "vitest";
import { ingestFilloutSubmission } from "@/lib/fillout-ingestion";
import { prisma } from "@/lib/prisma";
import {
  createAssignmentsForSubmission,
  markSubmissionAsProcessed,
} from "@/lib/assignments";
import type { FilloutSubmission } from "@/types/fillout";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    filloutForm: {
      upsert: vi.fn(),
    },
    filloutQuestion: {
      upsert: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    submissionAnswer: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/assignments", () => ({
  createAssignmentsForSubmission: vi.fn(),
  markSubmissionAsProcessed: vi.fn(),
}));

const submission: FilloutSubmission = {
  submissionId: "fillout-submission-1",
  submissionTime: "2026-05-21T10:29:08.801Z",
  questions: [
    {
      id: "p9mK",
      name: "Email",
      type: "EmailInput",
      value: "person@example.com",
    },
    {
      id: "6zoo",
      name: "Cum te numești?",
      type: "ShortAnswer",
      value: "Test User",
    },
  ],
};

describe("ingestFilloutSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.filloutForm.upsert).mockResolvedValue({
      id: "form-db-id",
      formId: "pqwmkBmnpbus",
      name: "Implicare 2.0",
    } as never);
    vi.mocked(prisma.filloutQuestion.upsert)
      .mockResolvedValueOnce({ id: "question-email-db-id" } as never)
      .mockResolvedValueOnce({ id: "question-name-db-id" } as never);
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.submission.create).mockResolvedValue({
      id: "submission-db-id",
    } as never);
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({
      id: "answer-db-id",
    } as never);
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined);
  });

  it("stores answers with database question ids and queues assignments by default", async () => {
    const result = await ingestFilloutSubmission(submission, {
      formId: "pqwmkBmnpbus",
      formName: "Implicare 2.0",
    });

    expect(result).toEqual({
      submissionId: "fillout-submission-1",
      databaseId: "submission-db-id",
      created: true,
      answersStored: 2,
      assignments: { created: 1, skipped: 0, errors: [] },
    });
    expect(prisma.filloutForm.upsert).toHaveBeenCalledWith({
      where: { formId: "pqwmkBmnpbus" },
      update: { name: "Implicare 2.0", status: "active" },
      create: {
        formId: "pqwmkBmnpbus",
        name: "Implicare 2.0",
        status: "active",
      },
    });
    expect(prisma.submissionAnswer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: "submission-db-id",
        questionId: "question-email-db-id",
      }),
    });
    expect(prisma.submissionAnswer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: "submission-db-id",
        questionId: "question-name-db-id",
      }),
    });
    expect(createAssignmentsForSubmission).toHaveBeenCalledWith(
      "submission-db-id",
      expect.objectContaining({ submissionId: "fillout-submission-1" }),
      { queueSendJobs: true },
    );
    expect(markSubmissionAsProcessed).toHaveBeenCalledWith("submission-db-id");
  });

  it("updates existing submissions and can suppress send-job queueing", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      id: "existing-submission-db-id",
    } as never);
    vi.mocked(prisma.submission.update).mockResolvedValue({
      id: "existing-submission-db-id",
    } as never);

    const result = await ingestFilloutSubmission(submission, {
      formId: "pqwmkBmnpbus",
      formName: "Implicare 2.0",
      queueSendJobs: false,
    });

    expect(result.created).toBe(false);
    expect(prisma.submissionAnswer.deleteMany).toHaveBeenCalledWith({
      where: { submissionId: "existing-submission-db-id" },
    });
    expect(createAssignmentsForSubmission).toHaveBeenCalledWith(
      "existing-submission-db-id",
      expect.any(Object),
      { queueSendJobs: false },
    );
  });
});
