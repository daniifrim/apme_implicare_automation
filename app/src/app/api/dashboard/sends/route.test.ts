// ABOUTME: Tests send-job dashboard API counts and recent job payloads
// ABOUTME: Verifies actionable pending semantics through the public route

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sendJob: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
    legacyEmailHistory: {
      findMany: vi.fn(),
    },
  },
}));

const baseJob = {
  email: "unsent@example.com",
  templateName: "Welcome Email",
  status: "pending",
  retryCount: 0,
  lastError: null,
  sentAt: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  submission: {
    firstName: "Test",
    lastName: "User",
    submissionId: "response-unsent",
  },
  template: {
    name: "Welcome Email",
    slug: "welcome-email",
  },
};

describe("GET /api/dashboard/sends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts only actionable pending jobs as pending", async () => {
    const actionablePendingJob = {
      ...baseJob,
      id: "job-actionable",
      submissionId: "submission-actionable",
      templateId: "template-welcome",
    };
    const assignmentAlreadySentJob = {
      ...baseJob,
      id: "job-assignment-sent",
      submissionId: "submission-sent",
      templateId: "template-welcome",
      email: "assignment-sent@example.com",
    };
    const legacyAlreadySentJob = {
      ...baseJob,
      id: "job-legacy-sent",
      submissionId: "submission-legacy",
      templateId: "template-kairos",
      email: "legacy-sent@example.com",
      templateName: "Kairos Followup",
      submission: {
        ...baseJob.submission,
        submissionId: "response-legacy",
      },
    };
    const historicalImportJob = {
      ...baseJob,
      id: "job-historical-import",
      submissionId: "submission-historical",
      templateId: "template-long-term",
      email: "historical@example.com",
      templateName: "Long Term Followup",
      submission: {
        ...baseJob.submission,
        submissionId: "response-historical",
        rawData: {
          "Processing Status": "PROCESSED",
          "Processed At": "1/21/2026",
        },
      },
    };

    vi.mocked(prisma.sendJob.count)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.sendJob.findMany)
      .mockResolvedValueOnce([
        actionablePendingJob,
        assignmentAlreadySentJob,
        legacyAlreadySentJob,
        historicalImportJob,
      ] as never)
      .mockResolvedValueOnce([
        actionablePendingJob,
        assignmentAlreadySentJob,
        legacyAlreadySentJob,
        historicalImportJob,
      ] as never);
    vi.mocked(prisma.assignment.findMany).mockResolvedValueOnce([
      {
        submissionId: "submission-sent",
        templateId: "template-welcome",
      },
    ] as never);
    vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValueOnce([
      {
        email: "legacy-sent@example.com",
        templateName: "Kairos Followup",
        status: "SENT",
        responseId: "response-legacy",
      },
    ] as never);

    const request = new Request("http://localhost/api/dashboard/sends");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.counts.pending).toBe(1);
    expect(data.counts.skipped).toBe(3);
    expect(data.recentJobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "job-actionable",
          status: "pending",
          lastError: null,
        }),
        expect.objectContaining({
          id: "job-assignment-sent",
          status: "skipped",
          lastError: "already_sent_assignment",
        }),
        expect.objectContaining({
          id: "job-legacy-sent",
          status: "skipped",
          lastError: "already_sent_legacy",
        }),
        expect.objectContaining({
          id: "job-historical-import",
          status: "skipped",
          lastError: "historical_import",
        }),
      ]),
    );
  });

  it("keeps future submissions actionable when legacy history has a different responseId", async () => {
    const futureSubmissionJob = {
      ...baseJob,
      id: "job-future-submission",
      submissionId: "submission-current",
      templateId: "template-welcome",
      email: "repeat@example.com",
      templateName: "Welcome Email",
      submission: {
        ...baseJob.submission,
        submissionId: "response-current",
      },
    };

    vi.mocked(prisma.sendJob.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.sendJob.findMany)
      .mockResolvedValueOnce([futureSubmissionJob] as never)
      .mockResolvedValueOnce([futureSubmissionJob] as never);
    vi.mocked(prisma.assignment.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValueOnce([
      {
        email: "repeat@example.com",
        templateName: "Welcome Email",
        status: "SENT",
        responseId: "response-previous",
      },
    ] as never);

    const request = new Request("http://localhost/api/dashboard/sends");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.counts.pending).toBe(1);
    expect(data.counts.skipped).toBe(0);
    expect(data.recentJobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "job-future-submission",
          status: "pending",
          lastError: null,
        }),
      ]),
    );
  });
});
