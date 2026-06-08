import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkWebhookHealth, runHealthCheck, sendAlertEmail, logAlertsToConsole } from "@/lib/alerting";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sendJob: {
      count: vi.fn(),
    },
  },
}));

describe("alerting", () => {
  const TEST_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APPS_SCRIPT_WEBHOOK_URL = TEST_WEBHOOK_URL;
    process.env.APPS_SCRIPT_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.APPS_SCRIPT_WEBHOOK_URL;
    delete process.env.APPS_SCRIPT_API_KEY;
    delete process.env.ALERT_EMAIL;
  });

  describe("checkWebhookHealth", () => {
    it("should return error when webhook URL is not configured", async () => {
      const originalUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
      delete process.env.APPS_SCRIPT_WEBHOOK_URL;

      const result = await checkWebhookHealth();

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not configured");

      process.env.APPS_SCRIPT_WEBHOOK_URL = originalUrl;
    });

    it("should return ok for healthy webhook", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: "ok" }),
      });
      global.fetch = mockFetch;

      const result = await checkWebhookHealth();

      expect(result.ok).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return error for non-ok status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: "error" }),
      });
      global.fetch = mockFetch;

      const result = await checkWebhookHealth();

      expect(result.ok).toBe(false);
      expect(result.error).toContain("error");
    });

    it("should return error on network failure", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
      global.fetch = mockFetch;

      const result = await checkWebhookHealth();

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network timeout");
    });
  });

  describe("runHealthCheck", () => {
    it("should report healthy when no issues", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: "ok" }),
      });
      global.fetch = mockFetch;

      vi.mocked(prisma.sendJob.count).mockResolvedValue(0);

      const result = await runHealthCheck();

      expect(result.webhookHealthy).toBe(true);
      expect(result.failedJobCount).toBe(0);
      expect(result.alerts).toHaveLength(0);
    });

    it("should alert on failed jobs", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: "ok" }),
      });
      global.fetch = mockFetch;

      vi.mocked(prisma.sendJob.count)
        .mockResolvedValueOnce(3) // failed
        .mockResolvedValueOnce(0) // retrying
        .mockResolvedValueOnce(0); // pending

      const result = await runHealthCheck();

      expect(result.failedJobCount).toBe(3);
      expect(result.alerts).toContain("3 send job(s) in failed state");
    });

    it("should alert on retrying backlog", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: "ok" }),
      });
      global.fetch = mockFetch;

      vi.mocked(prisma.sendJob.count)
        .mockResolvedValueOnce(0) // failed
        .mockResolvedValueOnce(15) // retrying
        .mockResolvedValueOnce(0); // pending

      const result = await runHealthCheck();

      expect(result.retryingJobCount).toBe(15);
      expect(result.alerts).toContain("15 jobs stuck in retrying state");
    });
  });

  describe("logAlertsToConsole", () => {
    it("should log healthy state when no alerts", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logAlertsToConsole({
        webhookHealthy: true,
        failedJobCount: 0,
        retryingJobCount: 0,
        lastCheckAt: new Date().toISOString(),
        alerts: [],
      });

      expect(consoleSpy).toHaveBeenCalledWith("[Alerting] All systems healthy");
      consoleSpy.mockRestore();
    });

    it("should log alerts to console", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      logAlertsToConsole({
        webhookHealthy: false,
        failedJobCount: 3,
        retryingJobCount: 0,
        lastCheckAt: "2026-06-08T12:00:00Z",
        alerts: ["Webhook unhealthy: timeout"],
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1 issue(s) detected"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Webhook unhealthy: timeout"));
      consoleSpy.mockRestore();
    });
  });

  describe("sendAlertEmail", () => {
    it("should skip when ALERT_EMAIL is not configured", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      await sendAlertEmail({
        webhookHealthy: true,
        failedJobCount: 3,
        retryingJobCount: 0,
        lastCheckAt: new Date().toISOString(),
        alerts: ["3 send job(s) in failed state"],
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should skip when no alerts exist", async () => {
      process.env.ALERT_EMAIL = "admin@example.com";
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      await sendAlertEmail({
        webhookHealthy: true,
        failedJobCount: 0,
        retryingJobCount: 0,
        lastCheckAt: new Date().toISOString(),
        alerts: [],
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send alert email via webhook when alerts exist", async () => {
      process.env.ALERT_EMAIL = "admin@example.com";
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 302,
          headers: new Map([["location", "https://script.googleusercontent.com/redirect"]]),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ status: "success", message: "Sent" }),
        });
      global.fetch = mockFetch;

      await sendAlertEmail({
        webhookHealthy: false,
        failedJobCount: 3,
        retryingJobCount: 0,
        lastCheckAt: new Date().toISOString(),
        alerts: ["Webhook unhealthy: timeout", "3 send job(s) in failed state"],
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const postCall = mockFetch.mock.calls[0];
      expect(postCall[1].body).toContain("admin@example.com");
    });
  });
});
