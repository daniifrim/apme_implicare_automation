#!/usr/bin/env tsx
// ABOUTME: Imports/backfills Fillout submissions directly into Postgres without Google Sheets
// ABOUTME: Supports dry-run/apply modes while leaving actual email sending under dispatcher control
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import { ingestFilloutSubmission } from "../src/lib/fillout-ingestion";
import type { FilloutSubmission } from "../src/types/fillout";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes("--apply"),
    updateExisting: argv.includes("--update-existing"),
    queueSendJobs: !argv.includes("--no-queue-send-jobs"),
    limit: Number(
      argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 150,
    ),
  };
}

async function fetchFilloutSubmissions({
  apiKey,
  formId,
  limit,
}: {
  apiKey: string;
  formId: string;
  limit: number;
}) {
  const url = new URL(
    `https://api.fillout.com/v1/api/forms/${formId}/submissions`,
  );
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fillout API failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { responses?: FilloutSubmission[] };
  return data.responses || [];
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.FILLOUT_API_KEY;
  const formId = process.env.FILLOUT_FORM_ID || "pqwmkBmnpbus";
  const formName = process.env.FILLOUT_FORM_NAME || "Implicare 2.0";

  if (!apiKey) {
    throw new Error("FILLOUT_API_KEY is required");
  }

  const prisma = new PrismaClient();

  try {
    console.log(`\n🔄 Fillout Direct Import (${args.apply ? "APPLY" : "DRY RUN"})`);
    console.log("============================================================");
    console.log(`Form: ${formName} (${formId})`);

    const submissions = await fetchFilloutSubmissions({
      apiKey,
      formId,
      limit: args.limit,
    });
    const existingRows = await prisma.submission.findMany({
      where: {
        submissionId: {
          in: submissions.map((submission) => submission.submissionId),
        },
      },
      select: { submissionId: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.submissionId));
    const missing = submissions.filter(
      (submission) => !existingIds.has(submission.submissionId),
    );
    const candidates = args.updateExisting ? submissions : missing;

    console.log(`Fillout submissions fetched: ${submissions.length}`);
    console.log(`Already in database: ${existingIds.size}`);
    console.log(`Missing from database: ${missing.length}`);
    console.log(`Selected for ${args.apply ? "import" : "review"}: ${candidates.length}`);
    console.log(`Queue send jobs: ${args.queueSendJobs ? "yes" : "no"}`);

    if (candidates.length > 0) {
      console.log("\nSample selected submissions:");
      for (const submission of candidates.slice(0, 25)) {
        const email =
          submission.questions.find((question) =>
            question.name?.toLowerCase().includes("email"),
          )?.value || "";
        const name =
          submission.questions.find((question) => question.name?.includes("numești"))
            ?.value || "";
        console.log(
          `${submission.submissionTime.slice(0, 10)} | ${name} | ${email} | ${submission.submissionId}`,
        );
      }
    }

    if (!args.apply) {
      console.log("\n✋ This was a DRY RUN. No changes were made.");
      console.log("Run with --apply to import selected submissions.");
      return;
    }

    const results = {
      created: 0,
      updated: 0,
      answersStored: 0,
      assignmentsCreated: 0,
      assignmentsSkipped: 0,
      errors: [] as string[],
    };

    for (const submission of candidates) {
      try {
        const result = await ingestFilloutSubmission(submission, {
          formId,
          formName,
          queueSendJobs: args.queueSendJobs,
        });
        if (result.created) results.created++;
        else results.updated++;
        results.answersStored += result.answersStored;
        results.assignmentsCreated += result.assignments.created;
        results.assignmentsSkipped += result.assignments.skipped;
        results.errors.push(...result.assignments.errors);
      } catch (error) {
        results.errors.push(
          `${submission.submissionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    console.log("\n✅ Import complete");
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
