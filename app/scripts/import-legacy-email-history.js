#!/usr/bin/env node
// ABOUTME: Imports legacy email history CSV into the LegacyEmailHistory Prisma model
// ABOUTME: Maps legacy template names to canonical Template records and reports unmatched rows
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const {
  chunkArray,
  getTemplateLookupKeys,
  normalizeTemplateName,
  normalizeLegacyTemplateName,
  parseLegacySentDate,
} = require("./legacy-email-history-utils");

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    csvPath: null,
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

async function runImport(prisma, args, report) {
  console.log("\n📧 Legacy Email History Import");
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
  const totalRows = limitedRows.length;

  // Load all templates for name mapping
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

  // Collect unique response IDs for batch lookup
  const responseIds = new Set();
  for (const r of limitedRows) {
    const responseId = (r.ResponseID || "").toString().trim();
    if (responseId) responseIds.add(responseId);
  }

  const responseIdList = [...responseIds];
  const submissionsByResponseId = new Map();

  if (responseIdList.length > 0) {
    for (const chunk of chunkArray(responseIdList, 500)) {
      const submissions = await prisma.submission.findMany({
        where: { submissionId: { in: chunk } },
        select: { id: true, submissionId: true, email: true },
      });
      for (const s of submissions) {
        submissionsByResponseId.set(s.submissionId, s);
      }
    }
  }

  const unmatchedTemplateCounts = new Map();
  const missingSubmissionCounts = new Map();
  const records = [];
  let importedCount = 0;
  let unmatchedTemplateCount = 0;
  let missingSubmissionCount = 0;

  for (const r of limitedRows) {
    const email = (r.Email || "").toString().trim();
    const templateName = normalizeLegacyTemplateName(r.TemplateName);
    const sentDate = parseLegacySentDate(r.SentDate);
    const status = (r.Status || "").toString().trim();
    const campaignContext = (r.CampaignContext || "").toString().trim() || null;
    const responseId = (r.ResponseID || "").toString().trim() || null;
    const personName = (r.PersonName || "").toString().trim() || null;
    const notes = (r.Notes || "").toString().trim() || null;
    const deliveryStatus = (r.DeliveryStatus || "").toString().trim() || null;
    const opened = (r.Opened || "").toString().trim() || "UNKNOWN";
    const clicked = (r.Clicked || "").toString().trim() || "UNKNOWN";
    const bounced = (r.Bounced || "").toString().trim() || "NO";

    // Try to map template name to a canonical Template
    let mappedTemplateName = templateName;
    let notesBuilder = notes ? [notes] : [];

    if (templateName) {
      const lookupKeys = getTemplateLookupKeys(templateName);
      let matchedTemplate = null;
      for (const k of lookupKeys) {
        const found = templateByNormName.get(k);
        if (found) {
          matchedTemplate = found;
          break;
        }
      }

      if (matchedTemplate) {
        mappedTemplateName = matchedTemplate.name;
      } else {
        unmatchedTemplateCount++;
        unmatchedTemplateCounts.set(
          templateName,
          (unmatchedTemplateCounts.get(templateName) || 0) + 1,
        );
        notesBuilder.push(`Unmatched template: ${templateName}`);
      }
    }

    // Try to find submission by ResponseID
    let submissionId = null;
    if (responseId) {
      const submission = submissionsByResponseId.get(responseId);
      if (submission) {
        submissionId = submission.id;
      } else {
        missingSubmissionCount++;
        missingSubmissionCounts.set(
          responseId,
          (missingSubmissionCounts.get(responseId) || 0) + 1,
        );
      }
    }

    // Build final notes
    const finalNotes = notesBuilder.length > 0 ? notesBuilder.join(" | ") : null;

    records.push({
      email,
      templateName: mappedTemplateName,
      sentDate,
      status,
      campaignContext,
      responseId,
      personName,
      notes: finalNotes,
      deliveryStatus,
      opened: opened || "UNKNOWN",
      clicked: clicked || "UNKNOWN",
      bounced: bounced || "NO",
    });

    importedCount++;
  }

  report.totalRows = totalRows;
  report.imported = importedCount;
  report.unmatchedTemplates = unmatchedTemplateCount;
  report.missingSubmissions = missingSubmissionCount;
  report.unmatchedTemplateDetails = topNCounts(unmatchedTemplateCounts, 20);
  report.missingSubmissionDetails = topNCounts(missingSubmissionCounts, 20);

  console.log(`  Total rows parsed: ${totalRows}`);
  console.log(`  Records to import: ${records.length}`);
  console.log(`  Unmatched templates: ${unmatchedTemplateCount}`);
  console.log(`  Missing submissions: ${missingSubmissionCount}`);

  if (unmatchedTemplateCount > 0) {
    console.log(`\n  ⚠️ Unmatched template names (top ${report.unmatchedTemplateDetails.length}):`);
    for (const { key, count } of report.unmatchedTemplateDetails) {
      console.log(`    - "${key}": ${count} row(s)`);
    }
  }

  if (missingSubmissionCount > 0) {
    console.log(`\n  ⚠️ Missing submission response IDs (top ${report.missingSubmissionDetails.length}):`);
    for (const { key, count } of report.missingSubmissionDetails) {
      console.log(`    - ${key}: ${count} row(s)`);
    }
  }

  if (args.dryRun) {
    console.log("\n  ✋ DRY RUN — no records written.");
    console.log("  Run with --apply to persist changes.");
    return true;
  }

  // Apply: use createMany in chunks with skipDuplicates
  let created = 0;
  let createErrors = 0;

  const CHUNK_SIZE = 500;
  for (const chunk of chunkArray(records, CHUNK_SIZE)) {
    try {
      const result = await prisma.legacyEmailHistory.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      created += result.count || 0;
    } catch (err) {
      createErrors++;
      console.error("  Error creating chunk:", err.message);
    }
  }

  report.created = created;
  report.createErrors = createErrors;

  console.log(`\n  ✅ Created: ${created} records`);
  if (createErrors > 0) {
    console.log(`  ❌ Chunk errors: ${createErrors}`);
  }

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

  const report = {
    mode: args.dryRun ? "DRY RUN" : "APPLY",
    startedAt: new Date().toISOString(),
    csvPath,
    totalRows: 0,
    imported: 0,
    unmatchedTemplates: 0,
    missingSubmissions: 0,
    unmatchedTemplateDetails: [],
    missingSubmissionDetails: [],
    created: 0,
    createErrors: 0,
  };

  try {
    console.log(`\n🔄 Legacy Email History Import (${report.mode})`);
    console.log("=".repeat(60));
    console.log(`CSV: ${csvPath}`);

    const success = await runImport(prisma, args, report);
    if (!success) {
      process.exitCode = 1;
      return;
    }

    const elapsedMs = Date.now() - startedAt;

    console.log("\n📋 Summary");
    console.log("=".repeat(40));
    console.log(`Mode: ${report.mode}`);
    console.log(`Elapsed: ${elapsedMs}ms`);
    console.log(`Total rows: ${report.totalRows}`);
    console.log(`Records prepared: ${report.imported}`);
    console.log(`Unmatched templates: ${report.unmatchedTemplates}`);
    console.log(`Missing submissions: ${report.missingSubmissions}`);

    if (!args.dryRun) {
      console.log(`Created: ${report.created}`);
      if (report.createErrors > 0) {
        console.log(`Chunk errors: ${report.createErrors}`);
      }
    }

    if (args.dryRun) {
      console.log("\n✋ This was a DRY RUN. No changes were made.");
      console.log("Run with --apply to persist changes.");
    } else {
      console.log("\n✅ Import completed successfully.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exitCode = 1;
});
