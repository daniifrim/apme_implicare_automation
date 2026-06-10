#!/usr/bin/env tsx
// ABOUTME: Batch-publish all email templates that are currently in draft status.
// Finds templates with status="draft", selects their latest version, and publishes it.
// Usage: tsx scripts/batch-publish-templates.ts [--dry-run]

import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

function loadEnvFile(filePath: string): void {
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

function loadEnv(): void {
  const appDir = path.resolve(__dirname, "..");
  loadEnvFile(path.join(appDir, ".env"));
  loadEnvFile(path.join(appDir, ".env.local"));
}

async function publishTemplate(
  templateId: string,
  versionId: string,
  versionNumber: number,
  templateName: string,
  dryRun: boolean,
): Promise<void> {
  const previousPublishedVersion = await prisma.templateVersion.findFirst({
    where: { templateId, isPublished: true },
  });

  if (dryRun) {
    return;
  }

  await prisma.$transaction([
    prisma.templateVersion.updateMany({
      where: { templateId },
      data: { isPublished: false },
    }),
    prisma.templateVersion.update({
      where: { id: versionId },
      data: { isPublished: true, publishedAt: new Date() },
    }),
    prisma.template.update({
      where: { id: templateId },
      data: { status: "active" },
    }),
  ]);

  await createAuditLog({
    userId: "system",
    action: "published",
    resource: "template",
    resourceId: templateId,
    oldValue: previousPublishedVersion
      ? {
          versionId: previousPublishedVersion.id,
          versionNumber: previousPublishedVersion.versionNumber,
        }
      : null,
    newValue: {
      versionId,
      versionNumber,
      templateName,
    },
  });
}

async function main(): Promise<void> {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("🟡 DRY RUN MODE — no changes will be applied\n");
  }

  const draftTemplates = await prisma.template.findMany({
    where: {
      status: "draft",
      versions: { some: {} },
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (draftTemplates.length === 0) {
    console.log("No draft templates found. Nothing to do.");
    return;
  }

  console.log(`Found ${draftTemplates.length} draft template(s):\n`);

  let published = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const template of draftTemplates) {
    const latestVersion = template.versions[0];

    if (!latestVersion) {
      console.log(
        `  ⚠️  ${template.name} (${template.slug}) — no versions, skipping`,
      );
      skipped++;
      continue;
    }

    console.log(
      `  ${dryRun ? "🔍" : "📤"} ${template.name} (${template.slug}) — version ${latestVersion.versionNumber}`,
    );

    try {
      await publishTemplate(
        template.id,
        latestVersion.id,
        latestVersion.versionNumber,
        template.name,
        dryRun,
      );
      published++;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : String(error);
      errors.push(`${template.name}: ${msg}`);
      console.error(`     ❌ Failed: ${msg}`);
    }
  }

  console.log("");
  if (dryRun) {
    console.log(
      `Dry run complete. Would publish ${published} template(s), skip ${skipped}.`,
    );
  } else {
    console.log(
      `Done. Published ${published} template(s), skipped ${skipped}.`,
    );
  }

  if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
