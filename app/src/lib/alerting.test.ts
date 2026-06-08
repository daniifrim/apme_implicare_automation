import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkWebhookHealth, runHealthCheck } from "@/lib/alerting";
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
  });

  afterEach(() => {
    delete process.env.APPS_SCRIPT_WEBHOOK_URL;
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
});
