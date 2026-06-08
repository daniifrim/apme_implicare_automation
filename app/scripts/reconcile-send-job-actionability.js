#!/usr/bin/env node
// ABOUTME: Reconciles already-sent pending send jobs without dispatching email
// ABOUTME: Provides dry-run reporting and explicit apply mode for operators
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const { PrismaClient } = require("@prisma/client");

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    limit: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--apply") {
      args.apply = true;
      args.dryRun = false;
      continue;
    }

    if (a === "--dry-run") {
      args.apply = false;
      args.dryRun = true;
      continue;
    }

    if (a === "--limit") {
      const raw = argv[i + 1];
      i++;
      if (!raw) continue;
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (!key) continue;

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function ensureEnvLoaded(appDir) {
  // Prisma client does not auto-load .env for node scripts.
  // We load it silently so DATABASE_URL is available.
  loadEnvFile(path.join(appDir, ".env"));
  loadEnvFile(path.join(appDir, ".env.local"));
}

function legacyKey(email, templateName) {
  return `${email.trim().toLowerCase()}::${templateName.trim().toLowerCase()}`;
}

function responseLegacyKey(responseId, legacyKeyValue) {
  return `${responseId}::${legacyKeyValue}`;
}

function normalizeResponseId(responseId) {
  return (responseId || "").trim();
}

function isHistoricalImportedProcessedSubmission(rawData) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return false;
  }

  const processingStatus = String(rawData["Processing Status"] || "").trim();
  const processedAt = String(rawData["Processed At"] || "").trim();

  return processingStatus.toUpperCase() === "PROCESSED" || processedAt.length > 0;
}

async function findAlreadySentReasons(prisma, jobs) {
  const reasons = new Map();

  if (jobs.length === 0) {
    return reasons;
  }

  for (const job of jobs) {
    if (isHistoricalImportedProcessedSubmission(job.submission?.rawData)) {
      reasons.set(job.id, "historical_import");
    }
  }

  const sentAssignments = await prisma.assignment.findMany({
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
  const legacyRows = await prisma.legacyEmailHistory.findMany({
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

  const legacySentKeys = new Set();
  const legacySentResponseKeys = new Set();

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

async function runReconciliation(prisma, args) {
  const pendingJobs = await prisma.sendJob.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: args.limit ?? undefined,
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

  const reasons = await findAlreadySentReasons(prisma, pendingJobs);
  const jobIdsByReason = new Map();

  for (const [jobId, reason] of reasons.entries()) {
    const jobIds = jobIdsByReason.get(reason) ?? [];
    jobIds.push(jobId);
    jobIdsByReason.set(reason, jobIds);
  }

  let skipped = 0;

  if (args.apply) {
    for (const [reason, jobIds] of jobIdsByReason.entries()) {
      const result = await prisma.sendJob.updateMany({
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
  }

  return {
    reviewed: pendingJobs.length,
    actionablePending: pendingJobs.length - reasons.size,
    alreadySent: reasons.size,
    skipped,
    byReason: Object.fromEntries(
      [...jobIdsByReason.entries()].map(([reason, jobIds]) => [
        reason,
        jobIds.length,
      ]),
    ),
    sampleJobIds: [...reasons.keys()].slice(0, 10),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appDir = path.resolve(__dirname, "..");

  ensureEnvLoaded(appDir);

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Put it in app/.env or export it in your shell.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const mode = args.dryRun ? "DRY RUN" : "APPLY";

  try {
    console.log(`\n🔄 Send Job Actionability Reconciliation (${mode})`);
    console.log("=".repeat(60));
    if (args.limit) console.log(`Limit: ${args.limit}`);

    const result = await runReconciliation(prisma, args);

    console.log("\n📋 Summary");
    console.log("=".repeat(50));
    console.log(`Reviewed pending jobs: ${result.reviewed}`);
    console.log(`Already-sent jobs: ${result.alreadySent}`);
    console.log(`Actionable pending jobs: ${result.actionablePending}`);
    console.log(`By reason: ${JSON.stringify(result.byReason)}`);
    if (result.sampleJobIds.length > 0) {
      console.log(`Sample job IDs: ${result.sampleJobIds.join(", ")}`);
    }

    if (args.dryRun) {
      console.log("\n✋ This was a DRY RUN. No changes were made.");
      console.log("Run with --apply to mark already-sent pending jobs skipped.");
    } else {
      console.log(`\n✅ Marked ${result.skipped} pending jobs as skipped.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exitCode = 1;
});
