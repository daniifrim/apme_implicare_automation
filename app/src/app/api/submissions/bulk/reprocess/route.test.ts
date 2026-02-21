import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/submissions/bulk/reprocess/route";
import { reprocessAssignments } from "@/lib/assignments";

vi.mock("@/lib/assignments", () => ({
  reprocessAssignments: vi.fn(),
}));

describe("POST /api/submissions/bulk/reprocess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: object) {
    return {
      json: () => Promise.resolve(body),
    } as unknown as Request;
  }

  it("should return 400 if submissionIds is missing", async () => {
    const request = createMockRequest({});

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("submissionIds");
  });

  it("should return 400 if submissionIds is empty array", async () => {
    const request = createMockRequest({ submissionIds: [] });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("submissionIds");
  });

  it("should reprocess multiple submissions successfully", async () => {
    vi.mocked(reprocessAssignments)
      .mockResolvedValueOnce({ created: 2, skipped: 0, errors: [] })
      .mockResolvedValueOnce({ created: 1, skipped: 1, errors: [] });

    const request = createMockRequest({
      submissionIds: ["sub-1", "sub-2"],
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.total).toBe(2);

    expect(reprocessAssignments).toHaveBeenCalledTimes(2);
    expect(reprocessAssignments).toHaveBeenCalledWith("sub-1");
    expect(reprocessAssignments).toHaveBeenCalledWith("sub-2");
  });

  it("should handle partial failures", async () => {
    vi.mocked(reprocessAssignments)
      .mockResolvedValueOnce({ created: 2, skipped: 0, errors: [] })
      .mockResolvedValueOnce({
        created: 0,
        skipped: 0,
        errors: ["Template not found"],
      });

    const request = createMockRequest({
      submissionIds: ["sub-1", "sub-2"],
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("should handle complete failure", async () => {
    vi.mocked(reprocessAssignments).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createMockRequest({
      submissionIds: ["sub-1", "sub-2"],
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(0);
    expect(body.failed).toBe(2);
    expect(body.errors.length).toBe(2);
  });

  it("should handle single submission", async () => {
    vi.mocked(reprocessAssignments).mockResolvedValue({
      created: 3,
      skipped: 0,
      errors: [],
    });

    const request = createMockRequest({
      submissionIds: ["sub-1"],
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.total).toBe(1);
  });

  it("should handle invalid JSON", async () => {
    const request = {
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as unknown as Request;

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
