// ABOUTME: Simple alerting system for webhook health and send job failures
// Extensible to email/Slack notifications later

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
 * Log alerts to console. Replace with email/Slack/PagerDuty later.
 */
export function logAlerts(state: AlertState): void {
  if (state.alerts.length === 0) {
    console.log("[Alerting] All systems healthy");
    return;
  }

  console.warn(`[Alerting] ${state.alerts.length} alert(s):`);
  for (const alert of state.alerts) {
    console.warn(`  ⚠️  ${alert}`);
  }
}
