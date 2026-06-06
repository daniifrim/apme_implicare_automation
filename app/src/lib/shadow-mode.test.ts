import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeShadowDecision,
  getShadowDecisionsForEmail,
  getMismatchReport,
} from "@/lib/shadow-mode";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: {
      findUnique: vi.fn(),
    },
    template: {
      findMany: vi.fn(),
    },
    legacyEmailHistory: {
      findMany: vi.fn(),
    },
    shadowDecision: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("shadow-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockSubmission(overrides: Record<string, unknown> = {}) {
    return {
      id: "submission-1",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      locationType: "romania",
      city: "Bucharest",
      country: "Romania",
      church: "Test Church",
      rawData: {},
      answers: [
        {
          question: {
            id: "q1",
            questionId: "q1",
            title: "Mission Interests",
            name: "mission_interests",
          },
          value: "volunteer",
          rawValue: "volunteer",
        },
      ],
      ...overrides,
    };
  }

  describe("computeShadowDecision", () => {
    it("should return not_comparable when submission has no email", async () => {
      const mockSubmission = createMockSubmission({ email: null });

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-1",
        submissionId: "submission-1",
        email: "",
        appTemplateSlugs: [],
        legacyTemplateNames: [],
        status: "not_comparable",
        reasonCodes: ["no_email"],
        createdAt: new Date("2024-01-01"),
      } as never);

      const result = await computeShadowDecision("submission-1");

      expect(result.status).toBe("not_comparable");
      expect(result.reasonCodes).toContain("no_email");
      expect(prisma.shadowDecision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "not_comparable",
            reasonCodes: ["no_email"],
          }),
        }),
      );
    });

    it("should return missing_legacy when no email history exists", async () => {
      const mockSubmission = createMockSubmission();

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: "t1", slug: "info-voluntariat-apme", name: "Info Voluntariat APME" },
      ] as never);
      vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-2",
        submissionId: "submission-1",
        email: "test@example.com",
        appTemplateSlugs: ["info-voluntariat-apme"],
        legacyTemplateNames: [],
        status: "missing_legacy",
        reasonCodes: ["no_legacy_history"],
        createdAt: new Date("2024-01-01"),
      } as never);

      const result = await computeShadowDecision("submission-1");

      expect(result.status).toBe("missing_legacy");
      expect(result.reasonCodes).toContain("no_legacy_history");
      expect(prisma.legacyEmailHistory.findMany).toHaveBeenCalledWith({
        where: { email: "test@example.com", status: "SENT" },
      });
    });

    it("should return match when app and legacy templates align", async () => {
      const mockSubmission = createMockSubmission();

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: "t1", slug: "info-voluntariat-apme", name: "Info Voluntariat APME" },
      ] as never);
      vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValue([
        { id: "h1", email: "test@example.com", templateName: "Info Voluntariat APME", status: "SENT" },
      ] as never);
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-3",
        submissionId: "submission-1",
        email: "test@example.com",
        appTemplateSlugs: ["info-voluntariat-apme"],
        legacyTemplateNames: ["Info Voluntariat APME"],
        status: "match",
        reasonCodes: ["templates_match"],
        createdAt: new Date("2024-01-01"),
      } as never);

      const result = await computeShadowDecision("submission-1");

      expect(result.status).toBe("match");
      expect(result.reasonCodes).toContain("templates_match");
      expect(result.appTemplateNames).toContain("Info Voluntariat APME");
    });

    it("should return mismatch when app and legacy templates differ", async () => {
      const mockSubmission = createMockSubmission();

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: "t1", slug: "info-voluntariat-apme", name: "Info Voluntariat APME" },
      ] as never);
      vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValue([
        { id: "h1", email: "test@example.com", templateName: "Info Donatii APME", status: "SENT" },
      ] as never);
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-4",
        submissionId: "submission-1",
        email: "test@example.com",
        appTemplateSlugs: ["info-voluntariat-apme"],
        legacyTemplateNames: ["Info Donatii APME"],
        status: "mismatch",
        reasonCodes: [
          "template_mismatch",
          'app_only: ["Info Voluntariat APME"]',
          'legacy_only: ["Info Donatii APME"]',
        ],
        createdAt: new Date("2024-01-01"),
      } as never);

      const result = await computeShadowDecision("submission-1");

      expect(result.status).toBe("mismatch");
      expect(result.reasonCodes[0]).toBe("template_mismatch");
    });

    it("should not call any email sending function", async () => {
      const mockSubmission = createMockSubmission();

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: "t1", slug: "info-voluntariat-apme", name: "Info Voluntariat APME" },
      ] as never);
      vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-5",
        submissionId: "submission-1",
        email: "test@example.com",
        appTemplateSlugs: ["info-voluntariat-apme"],
        legacyTemplateNames: [],
        status: "missing_legacy",
        reasonCodes: ["no_legacy_history"],
        createdAt: new Date("2024-01-01"),
      } as never);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await computeShadowDecision("submission-1");

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("send"),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });

    it("should store a ShadowDecision record in the database", async () => {
      const mockSubmission = createMockSubmission();

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(
        mockSubmission as never,
      );
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: "t1", slug: "info-voluntariat-apme", name: "Info Voluntariat APME" },
      ] as never);
      vi.mocked(prisma.legacyEmailHistory.findMany).mockResolvedValue([
        { id: "h1", email: "test@example.com", templateName: "Info Voluntariat APME", status: "SENT" },
      ] as never);
      vi.mocked(prisma.shadowDecision.create).mockResolvedValue({
        id: "sd-6",
        submissionId: "submission-1",
        email: "test@example.com",
        appTemplateSlugs: ["info-voluntariat-apme"],
        legacyTemplateNames: ["Info Voluntariat APME"],
        status: "match",
        reasonCodes: ["templates_match"],
        createdAt: new Date("2024-01-01"),
      } as never);

      await computeShadowDecision("submission-1");

      expect(prisma.shadowDecision.create).toHaveBeenCalledTimes(1);
      expect(prisma.shadowDecision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: "submission-1",
            email: "test@example.com",
            status: "match",
          }),
        }),
      );
    });
  });

  describe("getShadowDecisionsForEmail", () => {
    it("should return decisions ordered by createdAt desc", async () => {
      vi.mocked(prisma.shadowDecision.findMany).mockResolvedValue([
        {
          id: "sd-1",
          submissionId: "sub-1",
          email: "test@example.com",
          appTemplateSlugs: ["info-voluntariat-apme"],
          legacyTemplateNames: ["Info Voluntariat APME"],
          status: "match",
          reasonCodes: ["templates_match"],
          createdAt: new Date("2024-02-01"),
        },
        {
          id: "sd-2",
          submissionId: "sub-2",
          email: "test@example.com",
          appTemplateSlugs: ["info-donatii-apme"],
          legacyTemplateNames: [],
          status: "missing_legacy",
          reasonCodes: ["no_legacy_history"],
          createdAt: new Date("2024-01-01"),
        },
      ] as never);

      const result = await getShadowDecisionsForEmail("test@example.com");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("sd-1");
      expect(result[1].id).toBe("sd-2");
      expect(prisma.shadowDecision.findMany).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("getMismatchReport", () => {
    it("should return only mismatch decisions ordered by createdAt desc", async () => {
      vi.mocked(prisma.shadowDecision.findMany).mockResolvedValue([
        {
          id: "sd-1",
          submissionId: "sub-1",
          email: "test@example.com",
          appTemplateSlugs: ["info-voluntariat-apme"],
          legacyTemplateNames: ["Info Donatii APME"],
          status: "mismatch",
          reasonCodes: ["template_mismatch"],
          createdAt: new Date("2024-02-01"),
        },
      ] as never);

      const result = await getMismatchReport();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("mismatch");
      expect(prisma.shadowDecision.findMany).toHaveBeenCalledWith({
        where: { status: "mismatch" },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
