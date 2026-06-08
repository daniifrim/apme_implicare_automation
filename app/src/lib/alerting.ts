// ABOUTME: Production alerting system for webhook health and send job failures
// Primary channel: stdout (captured by Docker logs, always works)
// Secondary channel: email via Apps Script webhook (best-effort, may fail if webhook is down)

import { prisma } from "@/lib/prisma";

export interface HealthCheckResult {
  ok: boolean;
  timestamp: string;
  responseTimeMs: number;
  error?: string;
}

export interface AlertState {
  webhookHealthy: boolean;
  failedJobCount: number;
  retryingJobCount: number;
  lastCheckAt: string;
  alerts: string[];
}

/**
 * Check if the Apps Script webhook is responding
 */
export async function checkWebhookHealth(): Promise<HealthCheckResult> {
  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      responseTimeMs: 0,
      error: "APPS_SCRIPT_WEBHOOK_URL not configured",
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(webhookUrl, {
      method: "GET",
      // Apps Script web apps redirect on GET too; follow redirects
      redirect: "follow",
    });

    const responseTimeMs = Date.now() - start;

    if (!res.ok) {
      return {
        ok: false,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        error: `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { status?: string };

    if (data.status !== "ok") {
      return {
        ok: false,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        error: `Webhook status: ${data.status ?? "unknown"}`,
      };
    }

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      responseTimeMs,
    };
  } catch (error) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run full health check and return alert state
 */
export async function runHealthCheck(): Promise<AlertState> {
  const alerts: string[] = [];

  // 1. Webhook health
  const webhookResult = await checkWebhookHealth();
  if (!webhookResult.ok) {
    alerts.push(`Webhook unhealthy: ${webhookResult.error}`);
  }

  // 2. Failed jobs
  const failedJobCount = await prisma.sendJob.count({
    where: { status: "failed" },
  });
  if (failedJobCount > 0) {
    alerts.push(`${failedJobCount} send job(s) in failed state`);
  }

  // 3. Retrying jobs (backlog)
  const retryingJobCount = await prisma.sendJob.count({
    where: { status: "retrying" },
  });
  if (retryingJobCount > 10) {
    alerts.push(`${retryingJobCount} jobs stuck in retrying state`);
  }

  // 4. Pending jobs (shouldn't pile up if sender is enabled)
  const pendingJobCount = await prisma.sendJob.count({
    where: { status: "pending" },
  });
  if (pendingJobCount > 50) {
    alerts.push(`${pendingJobCount} jobs pending — sender may be backed up`);
  }

  return {
    webhookHealthy: webhookResult.ok,
    failedJobCount,
    retryingJobCount,
    lastCheckAt: new Date().toISOString(),
    alerts,
  };
}

/**
 * Log alerts to console as the primary channel.
 * This always works and is captured by Docker/infra logging.
 */
export function logAlertsToConsole(state: AlertState): void {
  if (state.alerts.length === 0) {
    console.log("[Alerting] All systems healthy");
    return;
  }

  console.warn(`[ALERT] ${state.alerts.length} issue(s) detected at ${state.lastCheckAt}`);
  for (const alert of state.alerts) {
    console.warn(`[ALERT] ${alert}`);
  }
}

/**
 * Best-effort alert email via Apps Script webhook.
 * WARN: If the webhook itself is down, this will fail.
 * The primary alert channel is stdout (logAlertsToConsole).
 */
export async function sendAlertEmail(state: AlertState): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;
  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
  const apiKey = process.env.APPS_SCRIPT_API_KEY;

  if (!alertEmail || !webhookUrl || !apiKey) {
    console.warn("[Alerting] Email not configured: set ALERT_EMAIL, APPS_SCRIPT_WEBHOOK_URL, APPS_SCRIPT_API_KEY");
    return;
  }

  if (state.alerts.length === 0) {
    return;
  }

  const subject = `🚨 APME Alert: ${state.alerts.length} issue(s) detected`;
  const body = state.alerts.join("\n");

  try {
    const postRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        jobId: `alert-${Date.now()}`,
        email: alertEmail,
        templateName: "Info Misiune pe termen scurt APME", // Generic template for alert format
        submissionId: "alert",
        personalizationData: {
          FirstName: "Admin",
          AlertSubject: subject,
          AlertBody: body,
        },
      }),
      redirect: "manual",
    });

    if (postRes.status !== 302) {
      console.error("[Alerting] Failed to send alert email:", await postRes.text());
      return;
    }

    const redirectUrl = postRes.headers.get("location");
    if (!redirectUrl) {
      console.error("[Alerting] Alert email redirect missing");
      return;
    }

    const getRes = await fetch(redirectUrl, { method: "GET" });
    const data = await getRes.json();

    if (data.status === "success") {
      console.log(`[Alerting] Alert email sent to ${alertEmail}`);
    } else {
      console.error("[Alerting] Alert email webhook error:", data.message);
    }
  } catch (error) {
    console.error("[Alerting] Failed to send alert email:", error);
  }
}

/**
 * Production alerting entrypoint.
 * 1. Always logs to console (primary, reliable)
 * 2. Best-effort email via webhook (secondary, may fail if webhook down)
 */
export async function logAndNotifyAlerts(state: AlertState): Promise<void> {
  logAlertsToConsole(state);

  if (state.alerts.length > 0) {
    await sendAlertEmail(state);
  }
}
