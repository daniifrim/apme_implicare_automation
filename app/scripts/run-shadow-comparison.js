#!/usr/bin/env node
// ABOUTME: Runs shadow mode comparison on real submissions and reports mismatch rate
// ABOUTME: Uses responseId-aware comparison for fair matching
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { normalizeLegacyTemplateName } = require("./legacy-email-history-utils");

const prisma = new PrismaClient();

async function computeShadowDecision(submissionId) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { answers: { include: { question: true } } },
  });

  if (!submission) throw new Error(`Submission not found: ${submissionId}`);
  if (!submission.email) {
    return prisma.shadowDecision.create({
      data: {
        submissionId,
        email: "",
        appTemplateSlugs: [],
        legacyTemplateNames: [],
        status: "not_comparable",
        reasonCodes: ["no_email"],
      },
    });
  }

  // Build answers record like assignment engine expects
  const answers = {};
  for (const a of submission.answers) {
    const key = a.question.name.toLowerCase().replace(/\s+/g, "_");
    answers[key] = a.rawValue;
  }

  // Replicate assignment engine rules inline
  const appSlugs = [];
  const prayerMethod = String(answers["prayer_method"] || "").toLowerCase();
  const ethnicGroupChoice = String(answers["ethnic_group_choice"] || "").toLowerCase();
  if (prayerMethod.includes("adopt") || ethnicGroupChoice) {
    appSlugs.push("info-rugaciune-pentru-grup-etnic");
  }
  if (prayerMethod.includes("missionary")) {
    appSlugs.push("info-rugaciune-pentru-misionari");
  }
  const missionInterests = String(answers["mission_interests"] || "").toLowerCase();
  if (missionInterests.includes("short_term")) {
    appSlugs.push("info-misiune-pe-termen-scurt-apme");
  }
  if (missionInterests.includes("camps")) {
    appSlugs.push("info-tabere-misiune-apme");
  }
  if (missionInterests.includes("volunteer")) {
    appSlugs.push("info-voluntariat-apme");
  }
  const desiredRole = String(answers["desired_role"] || "").toLowerCase();
  if (desiredRole.includes("missionary")) {
    appSlugs.push("info-misiune-pe-termen-lung-apme");
  }
  const supportInterests = String(answers["support_interests"] || "").toLowerCase();
  if (supportInterests.includes("donate")) {
    appSlugs.push("info-donatii-apme");
  }
  const courseInterests = String(answers["course_interests"] || "").toLowerCase();
  if (courseInterests.includes("kairos")) {
    appSlugs.push("info-despre-cursul-kairos");
  }
  if (courseInterests.includes("mobilizeaza")) {
    appSlugs.push("info-despre-cursul-mobilizeaza");
  }
  if (courseInterests.includes("crst")) {
    appSlugs.push("info-crst");
  }

  const templates = await prisma.template.findMany({
    where: { slug: { in: appSlugs } },
  });
  const appTemplateNames = templates.map((t) => t.name);

  // Use responseId-aware comparison: only legacy history matching this submission
  const legacyHistory = await prisma.legacyEmailHistory.findMany({
    where: {
      email: submission.email,
      status: "SENT",
      responseId: submission.submissionId,
    },
  });

  // Also get ALL legacy history for context
  const allLegacyHistory = await prisma.legacyEmailHistory.findMany({
    where: { email: submission.email, status: "SENT" },
  });

  const legacyTemplateNames = [...new Set(legacyHistory.map((h) => normalizeLegacyTemplateName(h.templateName)))];
  const allLegacyTemplateNames = [...new Set(allLegacyHistory.map((h) => normalizeLegacyTemplateName(h.templateName)))];

  let status;
  let reasonCodes;

  if (legacyTemplateNames.length === 0) {
    if (allLegacyTemplateNames.length === 0) {
      status = "missing_legacy";
      reasonCodes = ["no_legacy_history"];
    } else {
      status = "mismatch";
      reasonCodes = [
        "template_mismatch",
        "no_matching_response_id",
        `legacy_for_other_submissions: ${JSON.stringify(allLegacyTemplateNames)}`,
      ];
    }
  } else {
    const appSet = new Set(appTemplateNames.map((n) => n.toLowerCase()));
    const legacySet = new Set(legacyTemplateNames.map((n) => n.toLowerCase()));
    const appOnly = appTemplateNames.filter((n) => !legacySet.has(n.toLowerCase()));
    const legacyOnly = legacyTemplateNames.filter((n) => !appSet.has(n.toLowerCase()));

    if (appOnly.length === 0 && legacyOnly.length === 0) {
      status = "match";
      reasonCodes = ["templates_match"];
    } else {
      status = "mismatch";
      reasonCodes = [
        "template_mismatch",
        `app_only: ${JSON.stringify(appOnly)}`,
        `legacy_only: ${JSON.stringify(legacyOnly)}`,
      ];
    }
  }

  return prisma.shadowDecision.create({
    data: {
      submissionId,
      email: submission.email,
      appTemplateSlugs: appSlugs,
      legacyTemplateNames,
      status,
      reasonCodes,
    },
  });
}

async function main() {
  // Clear previous shadow decisions for clean stats
  await prisma.shadowDecision.deleteMany();

  const submissions = await prisma.submission.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  console.log(`Processing ${submissions.length} submissions...`);

  let processed = 0;
  for (const sub of submissions) {
    try {
      await computeShadowDecision(sub.id);
      processed++;
    } catch (e) {
      console.error(`Failed for ${sub.email}:`, e.message);
    }
  }

  console.log(`\nProcessed: ${processed}/${submissions.length}`);

  const stats = await prisma.shadowDecision.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  console.log("\n📊 Shadow Decision Stats (responseId-aware):");
  const total = stats.reduce((sum, s) => sum + s._count.status, 0);
  for (const s of stats) {
    const pct = ((s._count.status / total) * 100).toFixed(1);
    console.log(`  ${s.status}: ${s._count.status} (${pct}%)`);
  }

  const mismatches = await prisma.shadowDecision.findMany({
    where: { status: "mismatch" },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n🔍 Mismatch count: ${mismatches.length}`);

  // Break down mismatch reasons
  const noResponseIdMismatches = mismatches.filter((m) =>
    m.reasonCodes.some((r) => r.includes("no_matching_response_id")),
  );
  const templateDiffMismatches = mismatches.filter((m) =>
    m.reasonCodes.some((r) => r.includes("app_only") || r.includes("legacy_only")),
  );

  console.log(`  - No matching responseId: ${noResponseIdMismatches.length}`);
  console.log(`  - Template differences: ${templateDiffMismatches.length}`);

  if (templateDiffMismatches.length > 0) {
    console.log("\nFirst 10 template-difference mismatches:");
    for (const m of templateDiffMismatches.slice(0, 10)) {
      console.log(`  Email: ${m.email}`);
      console.log(`    App slugs: ${JSON.stringify(m.appTemplateSlugs)}`);
      console.log(`    Legacy: ${JSON.stringify(m.legacyTemplateNames)}`);
      console.log(`    Reasons: ${m.reasonCodes.join(", ")}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Unhandled error:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
