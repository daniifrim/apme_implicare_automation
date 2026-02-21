import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/submissions/[id]/assignments/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    template: {
      findUnique: vi.fn(),
    },
    assignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("POST /api/submissions/[id]/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: object, submissionId: string) {
    return {
      json: () => Promise.resolve(body),
      url: `http://localhost/api/submissions/${submissionId}/assignments`,
    } as unknown as Request;
  }

  it("should create assignment successfully", async () => {
    const mockTemplate = {
      id: "template-1",
      name: "Test Template",
      slug: "test",
    };
    const mockAssignment = {
      id: "assign-1",
      templateId: "template-1",
      submissionId: "sub-123",
      status: "pending",
      reasonCodes: ["manual"],
      template: mockTemplate,
    };

    vi.mocked(prisma.template.findUnique).mockResolvedValue(
      mockTemplate as never,
    );
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.assignment.create).mockResolvedValue(
      mockAssignment as never,
    );

    const request = createMockRequest({ templateId: "template-1" }, "sub-123");
    const response = await POST(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.template.name).toBe("Test Template");
    expect(body.status).toBe("pending");
    expect(body.reasonCodes).toContain("manual");
  });

  it("should return 400 if templateId is missing", async () => {
    const request = createMockRequest({}, "sub-123");
    const response = await POST(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("templateId");
  });

  it("should return 404 if template not found", async () => {
    vi.mocked(prisma.template.findUnique).mockResolvedValue(null);

    const request = createMockRequest({ templateId: "nonexistent" }, "sub-123");
    const response = await POST(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 409 if assignment already exists", async () => {
    vi.mocked(prisma.template.findUnique).mockResolvedValue({
      id: "template-1",
    } as never);
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue({
      id: "existing",
    } as never);

    const request = createMockRequest({ templateId: "template-1" }, "sub-123");
    const response = await POST(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("already exists");
  });

  it("should handle database errors", async () => {
    vi.mocked(prisma.template.findUnique).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest({ templateId: "template-1" }, "sub-123");
    const response = await POST(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });

    expect(response.status).toBe(500);
  });
});
