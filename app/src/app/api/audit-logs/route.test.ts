import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/audit-logs", () => {
  const mockAuditLogs = [
    {
      id: "log-1",
      userId: "user-1",
      action: "created",
      resource: "template",
      resourceId: "template-1",
      oldValue: null,
      newValue: { name: "Test Template" },
      createdAt: new Date("2025-02-01T10:00:00"),
      user: { id: "user-1", name: "John Doe", email: "john@apme.ro" },
    },
    {
      id: "log-2",
      userId: "user-2",
      action: "updated",
      resource: "mapping",
      resourceId: "mapping-1",
      oldValue: { field: "old" },
      newValue: { field: "new" },
      createdAt: new Date("2025-02-02T11:00:00"),
      user: { id: "user-2", name: "Jane Smith", email: "jane@apme.ro" },
    },
  ];

  const mockUsers = [
    { id: "user-1", name: "John Doe", email: "john@apme.ro" },
    { id: "user-2", name: "Jane Smith", email: "jane@apme.ro" },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
      mockAuditLogs as never,
    );
    vi.mocked(prisma.auditLog.count).mockResolvedValue(2);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
  });

  it("should return audit logs with pagination", async () => {
    const request = new NextRequest("http://localhost/api/audit-logs");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 2,
      pages: 1,
    });
    expect(data.filters.actions).toContain("created");
    expect(data.filters.resources).toContain("template");
  });

  it("should filter by action type", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?action=created",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "created" }),
      }),
    );
  });

  it("should filter by resource type", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?resource=template",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resource: "template" }),
      }),
    );
  });

  it("should filter by userId", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?userId=user-1",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });

  it("should handle pagination parameters", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?page=2&limit=25",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
      }),
    );
  });

  it("should enforce maximum limit of 100", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?limit=200",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }),
    );
  });

  it("should filter by date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?from=2025-01-01&to=2025-01-31",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2025-01-01"),
            lte: expect.any(Date),
          },
        }),
      }),
    );
  });

  it("should search by resourceId", async () => {
    const request = new NextRequest(
      "http://localhost/api/audit-logs?search=template-1",
    );

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              resourceId: { contains: "template-1", mode: "insensitive" },
            }),
          ]),
        }),
      }),
    );
  });

  it("should handle empty results", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

    const request = new NextRequest("http://localhost/api/audit-logs");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(prisma.auditLog.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/audit-logs");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch audit logs");
  });

  it("should return users who have created audit logs", async () => {
    const request = new NextRequest("http://localhost/api/audit-logs");

    const response = await GET(request);
    const data = await response.json();

    expect(data.filters.users).toEqual(mockUsers);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          auditLogs: {
            some: {},
          },
        },
      }),
    );
  });

  it("should sort events by createdAt descending", async () => {
    const request = new NextRequest("http://localhost/api/audit-logs");

    await GET(request);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
