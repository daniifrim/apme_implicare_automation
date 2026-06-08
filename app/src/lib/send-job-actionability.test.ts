// ABOUTME: Tests send-job actionability and reconciliation behavior
// ABOUTME: Uses mocked Prisma access so no emails or production data are touched

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcileAlreadySentPendingSendJobs } from "@/lib/send-job-actionability";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sendJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
    legacyEmailHistory: {
      findMany: vi.fn(),
    },
  },
}));

const pendingJob = {
  id: "job-unsent",
  submissionId: "submission-unsent",
  templateId: "template-welcome",
  email: "unsent@example.com",
  templateName: "Welcome Email",
};

const assignmentAlreadySentJob = {
  id: "job-assignment-sent",
  submissionId: "submission-sent",
  templateId: "template-welcome",
  email: "assignment-sent@example.com",
  templateName: "Welcome Email",
};

const legacyAlreadySentJob = {
  id: "job-legacy-sent",
  submissionId: "submission-legacy",
  templateId: "template-kairos",
  email: "legacy-sent@example.com",
  templateName: "Kairos Followup",
  submission: {
    submissionId: "response-legacy",
  },
};

describe("reconcileAlreadySentPendingSendJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips already-sent pending jobs idempotently and leaves unsent jobs pending", async () => {
    vi.mocked(prisma.sendJob.findMany)
      .mockResolvedValueOnce([
        pendingJob,
        assignmentAlreadySentJob,
        legacyAlreadySentJob,
      ] as never)
      .mockResolvedValueOnce([pendingJob] as never);
    vi.mocked(prisma.assignment.findMany)
      .mockResolvedValueOnce([
        {
          submissionId: "submission-sent",
          templateId: "template-welcome",
        },
      ] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.legacyEmailHistory.findMany)
      .mockResolvedValueOnce([
        {
          email: "legacy-sent@example.com",
          templateName: "Kairos Followup",
          status: "SENT",
          responseId: "response-legacy",
        },
      ] as never)
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.sendJob.updateMany)
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValueOnce({ count: 1 } as never);

    const firstRun = await reconcileAlreadySentPendingSendJobs();
    const secondRun = await reconcileAlreadySentPendingSendJobs();

    expect(firstRun).toEqual({ reviewed: 3, skipped: 2, leftPending: 1 });
    expect(secondRun).toEqual({ reviewed: 1, skipped: 0, leftPending: 1 });
    expect(prisma.sendJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["job-assignment-sent"] },
        status: "pending",
      },
      data: {
        status: "skipped",
        lastError: "already_sent_assignment",
      },
    });
    expect(prisma.sendJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["job-legacy-sent"] },
        status: "pending",
      },
      data: {
        status: "skipped",
        lastError: "already_sent_legacy",
      },
    });
    expect(prisma.sendJob.updateMany).toHaveBeenCalledTimes(2);
  });

  it("keeps same email and template pending when the legacy responseId is different", async () => {
    const futureSubmissionJob = {
      id: "job-future-submission",
      submissionId: "submission-current",
      templateId: "template-welcome",
      email: "repeat@example.com",
      templateName: "Welcome Email",
      submission: {
        submissionId: "response-current",
      },
    };

    vi.mocked(prisma.sendJob.findMany).mockResolvedValueOnce([
      futureSubmissionJob,
    ] as never);
    vi.mocked(prisma.assignment.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValueOnce([
      {
        email: "repeat@example.com",
        templateName: "Welcome Email",
        status: "SENT",
        responseId: "response-previous",
      },
    ] as never);

    const result = await reconcileAlreadySentPendingSendJobs();

    expect(result).toEqual({ reviewed: 1, skipped: 0, leftPending: 1 });
    expect(prisma.sendJob.updateMany).not.toHaveBeenCalled();
  });

  it("falls back to email and template matching when submission responseId is unavailable", async () => {
    const jobWithoutResponseId = {
      ...legacyAlreadySentJob,
      submission: null,
    };

    vi.mocked(prisma.sendJob.findMany).mockResolvedValueOnce([
      jobWithoutResponseId,
    ] as never);
    vi.mocked(prisma.assignment.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValueOnce([
      {
        email: "legacy-sent@example.com",
        templateName: "Kairos Followup",
        status: "SENT",
        responseId: null,
      },
    ] as never);
    vi.mocked(prisma.sendJob.updateMany).mockResolvedValueOnce({
      count: 1,
    } as never);

    const result = await reconcileAlreadySentPendingSendJobs();

    expect(result).toEqual({ reviewed: 1, skipped: 1, leftPending: 0 });
    expect(prisma.sendJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["job-legacy-sent"] },
        status: "pending",
      },
      data: {
        status: "skipped",
        lastError: "already_sent_legacy",
      },
    });
  });
});
