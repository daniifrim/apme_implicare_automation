import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditLog } from "./audit";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("createAuditLog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should create audit log with all fields", async () => {
    const auditData = {
      userId: "user-123",
      action: "created",
      resource: "template",
      resourceId: "template-456",
      oldValue: { name: "Old Name" },
      newValue: { name: "New Name" },
    };

    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);

    await createAuditLog(auditData);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        action: "created",
        resource: "template",
        resourceId: "template-456",
        oldValue: { name: "Old Name" },
        newValue: { name: "New Name" },
      },
    });
  });

  it("should create audit log without optional fields", async () => {
    const auditData = {
      userId: "user-123",
      action: "viewed",
      resource: "submission",
    };

    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: "audit-2",
    } as never);

    await createAuditLog(auditData);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        action: "viewed",
        resource: "submission",
        resourceId: undefined,
        oldValue: null,
        newValue: null,
      },
    });
  });

  it("should handle circular references gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const obj: Record<string, unknown> = { name: "Test" };
    obj.self = obj;

    const auditData = {
      userId: "user-123",
      action: "updated",
      resource: "template",
      newValue: obj,
    };

    await createAuditLog(auditData);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to create audit log:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("should log error but not throw when database fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error("DB error"));

    const auditData = {
      userId: "user-123",
      action: "created",
      resource: "template",
    };

    await expect(createAuditLog(auditData)).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to create audit log:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should serialize complex nested objects", async () => {
    const auditData = {
      userId: "user-123",
      action: "updated",
      resource: "template",
      oldValue: {
        config: {
          nested: {
            deep: "value",
          },
        },
        tags: ["tag1", "tag2"],
      },
      newValue: {
        config: {
          nested: {
            deep: "new value",
          },
        },
        tags: ["tag1", "tag2", "tag3"],
      },
    };

    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: "audit-4",
    } as never);

    await createAuditLog(auditData);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldValue: expect.objectContaining({
          config: expect.objectContaining({
            nested: { deep: "value" },
          }),
        }),
        newValue: expect.objectContaining({
          tags: ["tag1", "tag2", "tag3"],
        }),
      }),
    });
  });
});
