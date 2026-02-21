import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/submissions/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("GET /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(url: string) {
    return {
      url,
    } as unknown as Request;
  }

  it("should return submissions with default pagination", async () => {
    const mockSubmissions = [
      {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        status: "processed",
        assignments: [],
      },
      {
        id: "2",
        email: "test2@example.com",
        firstName: "Test2",
        status: "pending",
        assignments: [],
      },
    ];

    vi.mocked(prisma.submission.findMany).mockResolvedValue(
      mockSubmissions as never,
    );
    vi.mocked(prisma.submission.count).mockResolvedValue(2);

    const request = createMockRequest("http://localhost/api/submissions");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.submissions).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.total).toBe(2);
  });

  it("should filter by status", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest(
      "http://localhost/api/submissions?status=processed",
    );

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "processed" }),
      }),
    );
  });

  it("should filter by location type", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest(
      "http://localhost/api/submissions?location=romania",
    );

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationType: "romania" }),
      }),
    );
  });

  it("should filter by date range", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest(
      "http://localhost/api/submissions?from=2024-01-01&to=2024-01-31",
    );

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          submissionTime: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("should search by email, name, phone, and submission ID", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest(
      "http://localhost/api/submissions?search=john",
    );

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.any(Object) }),
            expect.objectContaining({ firstName: expect.any(Object) }),
            expect.objectContaining({ lastName: expect.any(Object) }),
            expect.objectContaining({ submissionId: expect.any(Object) }),
            expect.objectContaining({ phone: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });

  it("should combine multiple filters", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest(
      "http://localhost/api/submissions?status=processed&location=romania&from=2024-01-01&search=test",
    );

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "processed",
          locationType: "romania",
          submissionTime: expect.any(Object),
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it("should handle pagination", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(100);

    const request = createMockRequest(
      "http://localhost/api/submissions?page=3&limit=10",
    );

    const response = await GET(request);
    const body = await response.json();

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (3-1) * 10
        take: 10,
      }),
    );
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pages).toBe(10); // 100 / 10
  });

  it("should order by submissionTime desc", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest("http://localhost/api/submissions");

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { submissionTime: "desc" },
      }),
    );
  });

  it("should include assignments in response", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest("http://localhost/api/submissions");

    await GET(request);

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          assignments: expect.objectContaining({
            include: expect.objectContaining({
              template: true,
              version: true,
            }),
          }),
        }),
      }),
    );
  });

  it("should handle database errors", async () => {
    vi.mocked(prisma.submission.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createMockRequest("http://localhost/api/submissions");

    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch submissions");
  });

  it("should handle empty results", async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.submission.count).mockResolvedValue(0);

    const request = createMockRequest("http://localhost/api/submissions");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.submissions).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.pages).toBe(0);
  });
});
