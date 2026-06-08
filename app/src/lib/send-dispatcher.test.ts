import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createSendJob,
  dispatchSendJob,
  processPendingSendJobs,
  generateIdempotencyKey,
} from "@/lib/send-dispatcher";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sendJob: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("send-dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateIdempotencyKey", () => {
    it("should generate deterministic keys", () => {
      const key1 = generateIdempotencyKey("sub-1", "tpl-1", "a@b.com");
      const key2 = generateIdempotencyKey("sub-1", "tpl-1", "a@b.com");
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64);
    });

    it("should generate different keys for different inputs", () => {
      const key1 = generateIdempotencyKey("sub-1", "tpl-1", "a@b.com");
      const key2 = generateIdempotencyKey("sub-2", "tpl-1", "a@b.com");
      expect(key1).not.toBe(key2);
    });
  });

  describe("createSendJob", () => {
    it("should create a new job when no existing job", async () => {
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.sendJob.create).mockResolvedValue({
        id: "job-1",
      } as never);

      const result = await createSendJob({
        submissionId: "sub-1",
        templateId: "tpl-1",
        email: "test@example.com",
        templateName: "welcome",
      });

      expect(result.id).toBe("job-1");
      expect(prisma.sendJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: "sub-1",
            templateId: "tpl-1",
            templateName: "welcome",
            email: "test@example.com",
            status: "pending",
          }),
        }),
      );
    });

    it("should return existing job for duplicate idempotency key", async () => {
      const existing = { id: "job-existing" } as never;
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue(existing);

      const result = await createSendJob({
        submissionId: "sub-1",
        templateId: "tpl-1",
        email: "test@example.com",
        templateName: "welcome",
      });

      expect(result.id).toBe("job-existing");
      expect(prisma.sendJob.create).not.toHaveBeenCalled();
    });
  });

  describe("dispatchSendJob", () => {
    it("should skip when feature flag is disabled", async () => {
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue({
        id: "job-1",
        status: "pending",
        retryCount: 0,
        email: "test@example.com",
        templateName: "welcome",
        submissionId: "sub-1",
      } as never);

      const originalEnv = process.env.USE_APPS_SCRIPT_SENDER;
      process.env.USE_APPS_SCRIPT_SENDER = "false";

      await dispatchSendJob("job-1");

      expect(prisma.sendJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            status: "skipped",
            lastError: "feature_flag_disabled",
          }),
        }),
      );

      process.env.USE_APPS_SCRIPT_SENDER = originalEnv;
    });

    it("should mark as sent on success", async () => {
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue({
        id: "job-1",
        status: "pending",
        retryCount: 0,
        email: "test@example.com",
        templateName: "welcome",
        submissionId: "sub-1",
      } as never);

      // Apps Script web app redirect flow: POST returns 302, then GET redirect URL for response
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          status: 302,
          headers: new Map([["location", "https://script.googleusercontent.com/redirect"]]),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ status: "success", message: "Email sent" }),
        });
      global.fetch = mockFetch;

      const originalEnv = process.env.USE_APPS_SCRIPT_SENDER;
      process.env.USE_APPS_SCRIPT_SENDER = "true";
      process.env.APPS_SCRIPT_WEBHOOK_URL = "https://example.com/webhook";
      process.env.APPS_SCRIPT_API_KEY = "test-key";

      await dispatchSendJob("job-1");

      expect(prisma.sendJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            status: "sent",
            sentAt: expect.any(Date),
          }),
        }),
      );

      process.env.USE_APPS_SCRIPT_SENDER = originalEnv;
      delete process.env.APPS_SCRIPT_WEBHOOK_URL;
      delete process.env.APPS_SCRIPT_API_KEY;
    });

    it("should mark as retrying on failure when retryCount < 3", async () => {
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue({
        id: "job-1",
        status: "pending",
        retryCount: 1,
        email: "test@example.com",
        templateName: "welcome",
        submissionId: "sub-1",
      } as never);

      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const originalEnv = process.env.USE_APPS_SCRIPT_SENDER;
      process.env.USE_APPS_SCRIPT_SENDER = "true";
      process.env.APPS_SCRIPT_WEBHOOK_URL = "https://example.com/webhook";
      process.env.APPS_SCRIPT_API_KEY = "test-key";

      await dispatchSendJob("job-1");

      expect(prisma.sendJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            status: "retrying",
            retryCount: 2,
            lastError: "Network error",
          }),
        }),
      );

      process.env.USE_APPS_SCRIPT_SENDER = originalEnv;
      delete process.env.APPS_SCRIPT_WEBHOOK_URL;
      delete process.env.APPS_SCRIPT_API_KEY;
    });

    it("should mark as failed on permanent failure (retryCount >= 3)", async () => {
      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue({
        id: "job-1",
        status: "retrying",
        retryCount: 3,
        email: "test@example.com",
        templateName: "welcome",
        submissionId: "sub-1",
      } as never);

      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const originalEnv = process.env.USE_APPS_SCRIPT_SENDER;
      process.env.USE_APPS_SCRIPT_SENDER = "true";
      process.env.APPS_SCRIPT_WEBHOOK_URL = "https://example.com/webhook";
      process.env.APPS_SCRIPT_API_KEY = "test-key";

      await dispatchSendJob("job-1");

      expect(prisma.sendJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            status: "failed",
            retryCount: 4,
            lastError: "Network error",
          }),
        }),
      );

      process.env.USE_APPS_SCRIPT_SENDER = originalEnv;
      delete process.env.APPS_SCRIPT_WEBHOOK_URL;
      delete process.env.APPS_SCRIPT_API_KEY;
    });
  });

  describe("processPendingSendJobs", () => {
    it("should dispatch eligible jobs", async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      vi.mocked(prisma.sendJob.findMany).mockResolvedValue([
        {
          id: "job-1",
          status: "pending",
          retryCount: 0,
          updatedAt: pastDate,
        } as never,
      ]);

      vi.mocked(prisma.sendJob.findUnique).mockResolvedValue({
        id: "job-1",
        status: "pending",
        retryCount: 0,
        email: "test@example.com",
        templateName: "welcome",
        submissionId: "sub-1",
      } as never);

      // Apps Script web app redirect flow
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          status: 302,
          headers: new Map([["location", "https://script.googleusercontent.com/redirect"]]),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ status: "success", message: "Email sent" }),
        });
      global.fetch = mockFetch;

      const originalEnv = process.env.USE_APPS_SCRIPT_SENDER;
      process.env.USE_APPS_SCRIPT_SENDER = "true";
      process.env.APPS_SCRIPT_WEBHOOK_URL = "https://example.com/webhook";
      process.env.APPS_SCRIPT_API_KEY = "test-key";

      const result = await processPendingSendJobs();

      expect(result.processed).toBe(1);

      process.env.USE_APPS_SCRIPT_SENDER = originalEnv;
      delete process.env.APPS_SCRIPT_WEBHOOK_URL;
      delete process.env.APPS_SCRIPT_API_KEY;
    });

    it("should respect retry delay", async () => {
      const recentDate = new Date(Date.now() - 1000); // 1 second ago
      vi.mocked(prisma.sendJob.findMany).mockResolvedValue([
        {
          id: "job-1",
          status: "retrying",
          retryCount: 1,
          updatedAt: recentDate,
        } as never,
      ]);

      const result = await processPendingSendJobs();

      expect(result.processed).toBe(0);
    });
  });
});
