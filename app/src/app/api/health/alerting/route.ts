import { NextResponse } from "next/server";
import { runHealthCheck, logAndNotifyAlerts } from "@/lib/alerting";

export async function GET() {
  try {
    const state = await runHealthCheck();
    await logAndNotifyAlerts(state);

    return NextResponse.json(state);
  } catch (error) {
    console.error("[Alerting] Health check failed:", error);
    return NextResponse.json(
      {
        webhookHealthy: false,
        failedJobCount: 0,
        retryingJobCount: 0,
        lastCheckAt: new Date().toISOString(),
        alerts: ["Health check system error"],
      },
      { status: 500 },
    );
  }
}
