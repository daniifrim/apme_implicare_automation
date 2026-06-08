// ABOUTME: Send dispatcher that queues jobs and POSTs to Apps Script webhook
// ABOUTME: Handles idempotency, retry, and audit logging

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { SendJob } from "@prisma/client";

export interface SendJobInput {
  submissionId: string;
  templateId: string;
  email: string;
  templateName: string;
  personalizationData?: Record<string, string>;
}

export async function createSendJob(input: SendJobInput): Promise<SendJob> {
  const idempotencyKey = generateIdempotencyKey(
    input.submissionId,
    input.templateId,
    input.email,
  );

  const existing = await prisma.sendJob.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    return existing;
  }

  return prisma.sendJob.create({
    data: {
      submissionId: input.submissionId,
      templateId: input.templateId,
      templateName: input.templateName,
      email: input.email,
      idempotencyKey,
      status: "pending",
    },
  });
}

export async function dispatchSendJob(jobId: string): Promise<void> {
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

  if (process.env.USE_APPS_SCRIPT_SENDER !== "true") {
    await prisma.sendJob.update({
      where: { id: jobId },
      data: {
        status: "skipped",
        lastError: "feature_flag_disabled",
      },
    });
    console.log(`[SendDispatcher] skip job=${jobId} status=skipped error=feature_flag_disabled`);
    return;
  }

  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
  const apiKey = process.env.APPS_SCRIPT_API_KEY;

  if (!webhookUrl || !apiKey) {
    await prisma.sendJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        lastError: "missing_webhook_config",
      },
    });
    console.log(`[SendDispatcher] fail job=${jobId} status=failed error=missing_webhook_config`);
    return;
  }

  try {
    const data = await postToAppsScriptWebhook(webhookUrl, {
      apiKey,
      jobId,
      email: job.email,
      templateName: job.templateName,
      submissionId: job.submissionId,
      personalizationData: {},
    });

    if (data.status === "success") {
      await prisma.sendJob.update({
        where: { id: jobId },
        data: { status: "sent", sentAt: new Date() },
      });
      console.log(`[SendDispatcher] sent job=${jobId} status=sent`);
    } else {
      throw new Error(`webhook error: ${data.message || "unknown"}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const newRetryCount = job.retryCount + 1;
    const newStatus = newRetryCount >= 3 ? "failed" : "retrying";

    await prisma.sendJob.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        retryCount: newRetryCount,
        lastError: message,
      },
    });
    console.log(`[SendDispatcher] fail job=${jobId} status=${newStatus} error=${message}`);
  }
}

export async function processPendingSendJobs(): Promise<{
  processed: number;
  errors: number;
}> {
  const jobs = await prisma.sendJob.findMany({
    where: {
      status: { in: ["pending", "retrying"] },
    },
  });

  let processed = 0;
  let errors = 0;

  for (const job of jobs) {
    const retryDelayMs = 5 * 60 * 1000 * Math.pow(3, job.retryCount);
    const elapsed = Date.now() - job.updatedAt.getTime();

    if (elapsed < retryDelayMs) {
      continue;
    }

    try {
      await dispatchSendJob(job.id);
      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * POST to an Apps Script web app and follow the 302 redirect to get the response.
 * Apps Script web apps return a 302 redirect on POST; the response body is only
 * available by making a GET to the redirect URL.
 */
async function postToAppsScriptWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ status: string; message: string; [key: string]: unknown }> {
  const postRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  if (postRes.status !== 302) {
    const text = await postRes.text();
    throw new Error(`Expected 302 redirect, got ${postRes.status}: ${text.substring(0, 200)}`);
  }

  const redirectUrl = postRes.headers.get("location");
  if (!redirectUrl) {
    throw new Error("302 redirect missing Location header");
  }

  const getRes = await fetch(redirectUrl, { method: "GET" });
  const data = (await getRes.json()) as { status: string; message: string };
  return data;
}

export function generateIdempotencyKey(
  submissionId: string,
  templateId: string,
  email: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${submissionId}:${templateId}:${email}`)
    .digest("hex");
}
