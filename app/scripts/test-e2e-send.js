#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * End-to-end test: Create submission → assignment → send job → dispatch → email
 *
 * Usage:
 *   node scripts/test-e2e-send.js --email=test@example.com --template="Info Misiune pe termen scurt APME"
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Inline the dispatch logic to avoid module resolution issues
async function dispatchSendJob(jobId) {
  const job = await prisma.sendJob.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new Error(`SendJob not found: ${jobId}`);
  }

  if (job.status !== "pending" && job.status !== "retrying") {
    console.log(`[SendDispatcher] skip job=${jobId} status=${job.status}`);
    return;
  }

  await prisma.sendJob.update({
    where: { id: jobId },
    data: { status: "sending" },
  });

  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
  const apiKey = process.env.APPS_SCRIPT_API_KEY;

  if (!webhookUrl || !apiKey) {
    await prisma.sendJob.update({
      where: { id: jobId },
      data: { status: "failed", lastError: "missing_webhook_config" },
    });
    throw new Error("Missing webhook config");
  }

  // Apps Script web app redirect flow
  const payload = {
    apiKey,
    jobId,
    email: job.email,
    templateName: job.templateName,
    submissionId: job.submissionId,
    personalizationData: {},
  };

  const postRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  if (postRes.status !== 302) {
    const text = await postRes.text();
    throw new Error(
      `Expected 302 redirect, got ${postRes.status}: ${text.substring(0, 200)}`,
    );
  }

  const redirectUrl = postRes.headers.get("location");
  if (!redirectUrl) {
    throw new Error("302 redirect missing Location header");
  }

  const getRes = await fetch(redirectUrl, { method: "GET" });
  const data = await getRes.json();

  if (data.status === "success" || data.success === true) {
    await prisma.sendJob.update({
      where: { id: jobId },
      data: { status: "sent", sentAt: new Date() },
    });
    console.log(`[SendDispatcher] sent job=${jobId} status=sent`);
  } else {
    throw new Error(`webhook error: ${data.message || "unknown"}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const email =
    args.find((a) => a.startsWith("--email="))?.split("=")[1] ||
    "test@example.com";
  const templateName =
    args.find((a) => a.startsWith("--template="))?.split("=")[1] ||
    "Info Misiune pe termen scurt APME";

  console.log("=== APME End-to-End Send Test ===");
  console.log(`Email: ${email}`);
  console.log(`Template: ${templateName}`);
  console.log();

  // 1. Find or create test template
  let template = await prisma.template.findFirst({
    where: { name: templateName },
  });

  if (!template) {
    console.log("Template not found, creating test template...");
    template = await prisma.template.create({
      data: {
        slug: "test-template-e2e",
        name: templateName,
        status: "active",
      },
    });
  }
  console.log(`✓ Template: ${template.name} (${template.id})`);

  // 2. Create test submission
  const submissionId = `test-e2e-${Date.now()}`;
  const submission = await prisma.submission.create({
    data: {
      id: submissionId,
      submissionId: `fillout-test-${Date.now()}`,
      submissionTime: new Date(),
      email,
      firstName: "Test",
      lastName: "User",
      status: "pending",
      rawData: {
        test: true,
        mission_interests: ["short_term"],
      },
    },
  });
  console.log(`✓ Submission created: ${submission.id}`);

  // 3. Create assignment
  const assignment = await prisma.assignment.create({
    data: {
      submissionId: submission.id,
      templateId: template.id,
      status: "pending",
      reasonCodes: ["e2e-test"],
    },
  });
  console.log(`✓ Assignment created: ${assignment.id}`);

  // 4. Create send job
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${submission.id}:${template.id}:${email}`)
    .digest("hex");

  const sendJob = await prisma.sendJob.create({
    data: {
      submissionId: submission.id,
      templateId: template.id,
      templateName: template.name,
      email,
      idempotencyKey,
      status: "pending",
    },
  });
  console.log(`✓ SendJob created: ${sendJob.id} (status: ${sendJob.status})`);

  // 5. Dispatch send job
  console.log();
  console.log("Dispatching send job...");

  const originalFlag = process.env.USE_APPS_SCRIPT_SENDER;
  process.env.USE_APPS_SCRIPT_SENDER = "true";

  try {
    await dispatchSendJob(sendJob.id);

    const updatedJob = await prisma.sendJob.findUnique({
      where: { id: sendJob.id },
    });

    console.log();
    console.log("=== Result ===");
    console.log(`Status: ${updatedJob.status}`);
    console.log(`Sent at: ${updatedJob.sentAt || "N/A"}`);
    console.log(`Retry count: ${updatedJob.retryCount}`);
    console.log(`Last error: ${updatedJob.lastError || "None"}`);

    if (updatedJob.status === "sent") {
      console.log();
      console.log("🎉 SUCCESS! Email dispatched successfully.");
      console.log("Check danifrim14@gmail.com inbox (safety mode redirected test email).");
    } else {
      console.log();
      console.log(`⚠️  Job status: ${updatedJob.status}`);
      if (updatedJob.lastError) {
        console.log(`Error: ${updatedJob.lastError}`);
      }
    }
  } catch (error) {
    console.error();
    console.error("❌ Dispatch failed:", error.message);

    const updatedJob = await prisma.sendJob.findUnique({
      where: { id: sendJob.id },
    });
    console.log(`Job status after error: ${updatedJob.status}`);
    console.log(`Last error: ${updatedJob.lastError || "None"}`);
  } finally {
    process.env.USE_APPS_SCRIPT_SENDER = originalFlag;
  }

  console.log();
  console.log("Test data (use --cleanup to remove):");
  console.log(`  Submission: ${submission.id}`);
  console.log(`  Assignment: ${assignment.id}`);
  console.log(`  SendJob: ${sendJob.id}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
