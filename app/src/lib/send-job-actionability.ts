// ABOUTME: Determines whether pending send jobs are still eligible to send
// ABOUTME: Reconciles pending jobs with assignment and legacy sent evidence

import { prisma } from "@/lib/prisma";

type PendingSendJob = {
  id: string;
  submissionId: string;
  templateId: string;
  email: string;
  templateName: string;
  submission?: {
    submissionId: string | null;
    rawData?: unknown;
  } | null;
};

type SentAssignment = {
  submissionId: string;
  templateId: string;
};

type LegacySentEmail = {
  email: string;
  templateName: string;
  status: string;
  responseId: string | null;
};

type ActionabilityClient = {
  assignment: {
    findMany(args: unknown): Promise<SentAssignment[]>;
  };
  legacyEmailHistory: {
    findMany(args: unknown): Promise<LegacySentEmail[]>;
  };
};

type ReconciliationClient = ActionabilityClient & {
  sendJob: {
    findMany(args: unknown): Promise<PendingSendJob[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

export type AlreadySentReason =
  | "already_sent_assignment"
  | "already_sent_legacy"
  | "historical_import";

export type SendJobReconciliationResult = {
  reviewed: number;
  skipped: number;
  leftPending: number;
};

export async function findAlreadySentPendingSendJobReasons(
  jobs: PendingSendJob[],
  client: ActionabilityClient = prisma,
): Promise<Map<string, AlreadySentReason>> {
  const reasons = new Map<string, AlreadySentReason>();

  if (jobs.length === 0) {
    return reasons;
  }

  for (const job of jobs) {
    if (isHistoricalImportedProcessedSubmission(job.submission?.rawData)) {
      reasons.set(job.id, "historical_import");
    }
  }

  const sentAssignments = await client.assignment.findMany({
    where: {
      status: "sent",
      OR: jobs.map((job) => ({
        submissionId: job.submissionId,
        templateId: job.templateId,
      })),
    },
    select: {
      submissionId: true,
      templateId: true,
    },
  });

  const sentAssignmentKeys = new Set(
    sentAssignments.map(
      (assignment) => `${assignment.submissionId}::${assignment.templateId}`,
    ),
  );

  for (const job of jobs) {
    if (reasons.has(job.id)) continue;

    if (sentAssignmentKeys.has(`${job.submissionId}::${job.templateId}`)) {
      reasons.set(job.id, "already_sent_assignment");
    }
  }

  const emails = [...new Set(jobs.map((job) => job.email))];
  const legacyRows = await client.legacyEmailHistory.findMany({
    where: {
      email: { in: emails },
      status: { equals: "SENT", mode: "insensitive" },
    },
    select: {
      email: true,
      templateName: true,
      status: true,
      responseId: true,
    },
  });

  const legacySentKeys = new Set<string>();
  const legacySentResponseKeys = new Set<string>();

  for (const row of legacyRows) {
    if (row.status.toUpperCase() !== "SENT") continue;

    const key = legacyKey(row.email, row.templateName);
    legacySentKeys.add(key);

    const responseId = normalizeResponseId(row.responseId);
    if (responseId) {
      legacySentResponseKeys.add(responseLegacyKey(responseId, key));
    }
  }

  for (const job of jobs) {
    if (reasons.has(job.id)) continue;

    const key = legacyKey(job.email, job.templateName);
    const responseId = normalizeResponseId(job.submission?.submissionId);
    const legacySent = responseId
      ? legacySentResponseKeys.has(responseLegacyKey(responseId, key))
      : legacySentKeys.has(key);

    if (legacySent) {
      reasons.set(job.id, "already_sent_legacy");
    }
  }

  return reasons;
}

export async function reconcileAlreadySentPendingSendJobs(
  client: ReconciliationClient = prisma,
): Promise<SendJobReconciliationResult> {
  const pendingJobs = await client.sendJob.findMany({
    where: { status: "pending" },
    select: {
      id: true,
      submissionId: true,
      templateId: true,
      email: true,
      templateName: true,
      submission: {
        select: {
          submissionId: true,
          rawData: true,
        },
      },
    },
  });

  const reasons = await findAlreadySentPendingSendJobReasons(
    pendingJobs,
    client,
  );
  const jobIdsByReason = new Map<AlreadySentReason, string[]>();

  for (const [jobId, reason] of reasons.entries()) {
    const jobIds = jobIdsByReason.get(reason) ?? [];
    jobIds.push(jobId);
    jobIdsByReason.set(reason, jobIds);
  }

  let skipped = 0;

  for (const [reason, jobIds] of jobIdsByReason.entries()) {
    const result = await client.sendJob.updateMany({
      where: {
        id: { in: jobIds },
        status: "pending",
      },
      data: {
        status: "skipped",
        lastError: reason,
      },
    });
    skipped += result.count;
  }

  return {
    reviewed: pendingJobs.length,
    skipped,
    leftPending: pendingJobs.length - reasons.size,
  };
}

function legacyKey(email: string, templateName: string): string {
  return `${email.trim().toLowerCase()}::${templateName.trim().toLowerCase()}`;
}

function responseLegacyKey(responseId: string, legacyKeyValue: string): string {
  return `${responseId}::${legacyKeyValue}`;
}

function normalizeResponseId(responseId: string | null | undefined): string {
  return responseId?.trim() ?? "";
}

function isHistoricalImportedProcessedSubmission(rawData: unknown): boolean {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return false;
  }

  const record = rawData as Record<string, unknown>;
  const processingStatus = String(record["Processing Status"] ?? "").trim();
  const processedAt = String(record["Processed At"] ?? "").trim();

  return processingStatus.toUpperCase() === "PROCESSED" || processedAt.length > 0;
}
