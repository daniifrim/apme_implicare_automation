#!/usr/bin/env node
// ABOUTME: Reconciles legacy email history data with current database records
// ABOUTME: Imports CSV data to align template assignments and submission status
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const {
  chunkArray,
  getTemplateLookupKeys,
  normalizeTemplateName,
  parseLegacySentDate,
} = require("./legacy-email-history-utils");

const { inferTemplatesFromRawData } = require("./legacy-inference-rules");

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    csvPath: null,
    limit: null,
    skipPhase1: false,
    skipPhase2: false,
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

    if (a === "--csv") {
      args.csvPath = argv[i + 1] || null;
      i++;
      continue;
    }

    if (a === "--limit") {
      const raw = argv[i + 1];
      i++;
      if (!raw) continue;
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
      continue;
    }

    if (a === "--skip-phase1") {
      args.skipPhase1 = true;
      continue;
    }

    if (a === "--skip-phase2") {
      args.skipPhase2 = true;
      continue;
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

function topNCounts(map, n) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, count: v }));
}

async function runPhase1EmailHistoryReconciliation(prisma, args, report) {
  console.log("\n📧 Phase 1: Email History Reconciliation");
  console.log("=".repeat(50));

  if (!fs.existsSync(args.csvPath)) {
    console.error(`CSV not found: ${args.csvPath}`);
    return false;
  }

  const csvContent = fs.readFileSync(args.csvPath, "utf8");
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const limitedRows = args.limit ? rows.slice(0, args.limit) : rows;

  const sentRows = limitedRows.filter(
    (r) => (r.Status || "").toString().trim().toUpperCase() === "SENT",
  );

  const templates = await prisma.template.findMany({
    select: { id: true, name: true, slug: true },
  });

  const templateByNormName = new Map();
  for (const t of templates) {
    const key = normalizeTemplateName(t.name);
    if (!key) continue;
    if (!templateByNormName.has(key)) {
      templateByNormName.set(key, t);
    }
  }

  const responseIds = new Set();
  const missingResponseIdCount = { count: 0 };
  for (const r of sentRows) {
    const responseId = (r.ResponseID || "").toString().trim();
    if (!responseId) {
      missingResponseIdCount.count++;
      continue;
    }
    responseIds.add(responseId);
  }

  const responseIdList = [...responseIds];

  const submissionsByResponseId = new Map();
  for (const chunk of chunkArray(responseIdList, 500)) {
    const submissions = await prisma.submission.findMany({
      where: { submissionId: { in: chunk } },
      select: { id: true, submissionId: true, email: true },
    });
    for (const s of submissions) {
      submissionsByResponseId.set(s.submissionId, s);
    }
  }

  const missingTemplateCounts = new Map();
  const missingSubmissionCounts = new Map();

  // Map key: `${submissionInternalId}::${templateId}` -> { sentDate: Date|null }
  const desiredByPairKey = new Map();

  // Track unresolved template names for reporting
  const unresolvedTemplates = new Set();

  for (const r of sentRows) {
    const templateName = (r.TemplateName || "").toString().trim();
    const responseId = (r.ResponseID || "").toString().trim();

    if (!templateName || !responseId) continue;

    const lookupKeys = getTemplateLookupKeys(templateName);
    let template = null;
    for (const k of lookupKeys) {
      const found = templateByNormName.get(k);
      if (found) {
        template = found;
        break;
      }
    }
    if (!template) {
      missingTemplateCounts.set(
        templateName,
        (missingTemplateCounts.get(templateName) || 0) + 1,
      );
      unresolvedTemplates.add(templateName);
      continue;
    }

    const submission = submissionsByResponseId.get(responseId);
    if (!submission) {
      missingSubmissionCounts.set(
        responseId,
        (missingSubmissionCounts.get(responseId) || 0) + 1,
      );
      continue;
    }

    const sentDate = parseLegacySentDate(r.SentDate);

    const pairKey = `${submission.id}::${template.id}`;
    const existing = desiredByPairKey.get(pairKey);

    // Keep the latest timestamp if we have multiple entries.
    if (!existing) {
      desiredByPairKey.set(pairKey, { sentDate });
    } else if (
      sentDate &&
      (!existing.sentDate || sentDate.getTime() > existing.sentDate.getTime())
    ) {
      desiredByPairKey.set(pairKey, { sentDate });
    }
  }

  const desiredPairs = [...desiredByPairKey.entries()].map(([pairKey, v]) => {
    const [submissionId, templateId] = pairKey.split("::");
    return { submissionId, templateId, sentDate: v.sentDate };
  });

  const internalSubmissionIds = [
    ...new Set(desiredPairs.map((p) => p.submissionId)),
  ];

  const assignments = internalSubmissionIds.length
    ? await prisma.assignment.findMany({
        where: { submissionId: { in: internalSubmissionIds } },
        select: {
          id: true,
          submissionId: true,
          templateId: true,
          status: true,
          processedAt: true,
        },
      })
    : [];

  const assignmentByPairKey = new Map();
  for (const a of assignments) {
    assignmentByPairKey.set(`${a.submissionId}::${a.templateId}`, a);
  }

  let wouldUpdate = 0;
  let wouldCreate = 0;
  let missingAssignment = 0;
  let alreadyNonPending = 0;
  let updated = 0;
  let created = 0;
  let updateErrors = 0;
  let createErrors = 0;
  let wouldMarkSubmissionsProcessed = 0;
  let markedSubmissionsProcessed = 0;

  const createBatch = [];

  const now = new Date();

  // Align imported submissions with webhook processing behavior: if we have legacy
  // email history for a submission, it should not remain 'pending'.
  if (internalSubmissionIds.length) {
    wouldMarkSubmissionsProcessed = internalSubmissionIds.length;

    if (!args.dryRun) {
      try {
        const res = await prisma.submission.updateMany({
          where: {
            id: { in: internalSubmissionIds },
            status: "pending",
          },
          data: {
            status: "processed",
            processedAt: now,
          },
        });
        markedSubmissionsProcessed = res.count || 0;
      } catch {
        // Non-fatal: assignment reconciliation still succeeded.
      }
    }
  }

  for (const p of desiredPairs) {
    const a = assignmentByPairKey.get(`${p.submissionId}::${p.templateId}`);
    if (!a) {
      missingAssignment++;

      wouldCreate++;
      if (!args.dryRun) {
        createBatch.push({
          submissionId: p.submissionId,
          templateId: p.templateId,
          status: "sent",
          processedAt: p.sentDate || now,
          reasonCodes: ["legacy-email-history"],
        });
      }

      continue;
    }

    if (a.status !== "pending") {
      alreadyNonPending++;
      continue;
    }

    wouldUpdate++;

    if (args.dryRun) continue;

    try {
      const res = await prisma.assignment.updateMany({
        where: {
          submissionId: p.submissionId,
          templateId: p.templateId,
          status: "pending",
        },
        data: {
          status: "sent",
          processedAt: p.sentDate || now,
        },
      });
      updated += res.count || 0;
    } catch {
      updateErrors++;
    }
  }

  if (!args.dryRun && createBatch.length) {
    for (const chunk of chunkArray(createBatch, 500)) {
      try {
        const res = await prisma.assignment.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        created += res.count || 0;
      } catch {
        createErrors++;
      }
    }
  }

  // Store results in report
  report.phase1 = {
    csvRows: limitedRows.length,
    sentRows: sentRows.length,
    uniqueResponseIds: responseIdList.length,
    submissionsFound: submissionsByResponseId.size,
    desiredPairs: desiredPairs.length,
    wouldCreate,
    wouldUpdate,
    alreadyNonPending,
    wouldMarkSubmissionsProcessed,
    created,
    updated,
    markedSubmissionsProcessed,
    unresolvedTemplates: [...unresolvedTemplates],
    missingTemplateCounts: topNCounts(missingTemplateCounts, 10),
    missingSubmissionCounts: topNCounts(missingSubmissionCounts, 10),
  };

  console.log(`  CSV rows: ${limitedRows.length} (SENT: ${sentRows.length})`);
  console.log(`  Unique responseIds: ${responseIdList.length}`);
  console.log(
    `  Submissions found: ${submissionsByResponseId.size}/${responseIdList.length}`,
  );
  console.log(`  Desired assignment pairs: ${desiredPairs.length}`);
  console.log(`  Would create missing as sent: ${wouldCreate}`);
  console.log(`  Would update pending -> sent: ${wouldUpdate}`);
  console.log(`  Already non-pending: ${alreadyNonPending}`);

  if (unresolvedTemplates.size > 0) {
    console.log(
      `  ⚠️ Unresolved templates (skipped): ${unresolvedTemplates.size}`,
    );
    for (const name of unresolvedTemplates) {
      console.log(`    - ${name}`);
    }
  }

  if (!args.dryRun) {
    console.log(`  Created: ${created} (errors: ${createErrors})`);
    console.log(`  Updated: ${updated} (errors: ${updateErrors})`);
    console.log(
      `  Marked submissions processed: ${markedSubmissionsProcessed}`,
    );
  }

  return true;
}

async function runPhase2InferenceReconciliation(prisma, args, report) {
  console.log("\n📊 Phase 2: Inference from Raw Data");
  console.log("=".repeat(50));

  // Find processed submissions without assignments
  const submissionsWithoutAssignments = await prisma.submission.findMany({
    where: {
      status: "processed",
      assignments: {
        none: {},
      },
    },
    select: {
      id: true,
      submissionId: true,
      rawData: true,
      email: true,
      submissionTime: true,
    },
  });

  if (submissionsWithoutAssignments.length === 0) {
    console.log("  No processed submissions without assignments found.");
    report.phase2 = {
      submissionsChecked: 0,
      inferredAssignments: 0,
      created: 0,
      zeroMatchSubmissions: 0,
    };
    return true;
  }

  console.log(
    `  Submissions without assignments: ${submissionsWithoutAssignments.length}`,
  );

  // Get all templates for mapping
  const templates = await prisma.template.findMany({
    select: { id: true, name: true, slug: true },
  });

  const templateBySlug = new Map();
  for (const t of templates) {
    templateBySlug.set(t.slug, t);
  }

  // Infer templates for each submission
  const inferredAssignments = [];
  const zeroMatchSubmissions = [];

  for (const submission of submissionsWithoutAssignments) {
    const inferred = inferTemplatesFromRawData(submission.rawData);

    if (inferred.length === 0) {
      zeroMatchSubmissions.push({
        id: submission.id,
        submissionId: submission.submissionId,
        email: submission.email,
      });
      continue;
    }

    for (const tmpl of inferred) {
      const template = templateBySlug.get(tmpl.slug);
      if (!template) {
        console.log(`  ⚠️ Template not found for slug: ${tmpl.slug}`);
        continue;
      }

      inferredAssignments.push({
        submissionId: submission.id,
        templateId: template.id,
        status: "sent",
        processedAt: new Date(),
        reasonCodes: ["legacy-csv-inferred", tmpl.reason],
      });
    }
  }

  console.log(`  Inferred assignments: ${inferredAssignments.length}`);
  console.log(
    `  Submissions with zero matches: ${zeroMatchSubmissions.length}`,
  );

  // Apply changes if not dry-run
  let created = 0;
  let createErrors = 0;

  if (!args.dryRun && inferredAssignments.length > 0) {
    for (const chunk of chunkArray(inferredAssignments, 500)) {
      try {
        const res = await prisma.assignment.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        created += res.count || 0;
      } catch (e) {
        createErrors++;
        console.error("  Error creating assignments:", e.message);
      }
    }
    console.log(`  Created: ${created} (errors: ${createErrors})`);
  }

  report.phase2 = {
    submissionsChecked: submissionsWithoutAssignments.length,
    inferredAssignments: inferredAssignments.length,
    created,
    zeroMatchSubmissions: zeroMatchSubmissions.length,
    zeroMatchDetails: args.dryRun ? zeroMatchSubmissions.slice(0, 10) : [],
  };

  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const appDir = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(appDir, "..");

  // Use canonical file paths
  const defaultCsvPath = path.join(
    repoRoot,
    "docs",
    "data",
    "email-history.csv",
  );
  const csvPath = args.csvPath
    ? path.resolve(process.cwd(), args.csvPath)
    : defaultCsvPath;

  // Update args with resolved path
  args.csvPath = csvPath;

  ensureEnvLoaded(appDir);

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Put it in app/.env or export it in your shell.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const startedAt = Date.now();

  // Report object to accumulate results
  const report = {
    mode: args.dryRun ? "DRY RUN" : "APPLY",
    startedAt: new Date().toISOString(),
    phase1: null,
    phase2: null,
  };

  try {
    console.log(`\n🔄 Legacy Email History Reconciliation (${report.mode})`);
    console.log("=".repeat(60));
    console.log(`CSV: ${csvPath}`);
    if (args.skipPhase1) console.log("Skipping Phase 1 (Email History)");
    if (args.skipPhase2) console.log("Skipping Phase 2 (Inference)");

    // Phase 1: Email History Reconciliation
    if (!args.skipPhase1) {
      const phase1Success = await runPhase1EmailHistoryReconciliation(
        prisma,
        args,
        report,
      );
      if (!phase1Success) {
        process.exitCode = 1;
        return;
      }
    }

    // Phase 2: Inference from Raw Data
    if (!args.skipPhase2) {
      const phase2Success = await runPhase2InferenceReconciliation(
        prisma,
        args,
        report,
      );
      if (!phase2Success) {
        process.exitCode = 1;
        return;
      }
    }

    const elapsedMs = Date.now() - startedAt;

    // Final summary
    console.log("\n📋 Final Summary");
    console.log("=".repeat(50));
    console.log(`Mode: ${report.mode}`);
    console.log(`Elapsed: ${elapsedMs}ms`);

    if (report.phase1) {
      console.log(`\nPhase 1 (Email History):`);
      console.log(
        `  - Pairs from email history: ${report.phase1.desiredPairs}`,
      );
      console.log(`  - Would create: ${report.phase1.wouldCreate}`);
      console.log(`  - Would update: ${report.phase1.wouldUpdate}`);
      if (!args.dryRun) {
        console.log(`  - Created: ${report.phase1.created}`);
        console.log(`  - Updated: ${report.phase1.updated}`);
      }
      if (report.phase1.unresolvedTemplates.length > 0) {
        console.log(
          `  - Unresolved templates: ${report.phase1.unresolvedTemplates.length}`,
        );
      }
    }

    if (report.phase2) {
      console.log(`\nPhase 2 (Inference):`);
      console.log(
        `  - Submissions checked: ${report.phase2.submissionsChecked}`,
      );
      console.log(
        `  - Inferred assignments: ${report.phase2.inferredAssignments}`,
      );
      console.log(
        `  - Zero-match submissions: ${report.phase2.zeroMatchSubmissions}`,
      );
      if (!args.dryRun) {
        console.log(`  - Created: ${report.phase2.created}`);
      }
      if (args.dryRun && report.phase2.zeroMatchDetails.length > 0) {
        console.log(`  - First 10 zero-match submissions:`);
        for (const s of report.phase2.zeroMatchDetails) {
          console.log(`    * ${s.submissionId} (${s.email || "no email"})`);
        }
      }
    }

    if (args.dryRun) {
      console.log("\n✋ This was a DRY RUN. No changes were made.");
      console.log("Run with --apply to persist changes.");
    } else {
      console.log("\n✅ Changes applied successfully.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exitCode = 1;
});
