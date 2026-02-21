import { describe, it, expect, beforeEach, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/assignments/[id]/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Assignment Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/assignments/[id]", () => {
    it("should update assignment status", async () => {
      const mockAssignment = {
        id: "assign-1",
        status: "sent",
        template: { name: "Test Template" },
      };

      vi.mocked(prisma.assignment.update).mockResolvedValue(
        mockAssignment as never,
      );

      const request = {
        json: () => Promise.resolve({ status: "sent" }),
      } as unknown as Request;

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "assign-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("sent");
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: "assign-1" },
        data: { status: "sent" },
        include: { template: true, version: true },
      });
    });

    it("should return 400 if status is missing", async () => {
      const request = {
        json: () => Promise.resolve({}),
      } as unknown as Request;

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "assign-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("status is required");
    });

    it("should return 400 for invalid status", async () => {
      const request = {
        json: () => Promise.resolve({ status: "invalid_status" }),
      } as unknown as Request;

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "assign-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid status");
    });

    it("should accept all valid statuses", async () => {
      const validStatuses = ["pending", "sent", "failed", "cancelled"];

      for (const status of validStatuses) {
        vi.mocked(prisma.assignment.update).mockResolvedValue({
          id: "assign-1",
          status,
        } as never);

        const request = {
          json: () => Promise.resolve({ status }),
        } as unknown as Request;

        const response = await PATCH(request, {
          params: Promise.resolve({ id: "assign-1" }),
        });
        expect(response.status).toBe(200);
      }
    });

    it("should return 404 if assignment not found", async () => {
      vi.mocked(prisma.assignment.update).mockRejectedValue(
        new Error("Record not found"),
      );

      const request = {
        json: () => Promise.resolve({ status: "sent" }),
      } as unknown as Request;

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/assignments/[id]", () => {
    it("should delete assignment successfully", async () => {
      vi.mocked(prisma.assignment.delete).mockResolvedValue({
        id: "assign-1",
      } as never);

      const request = {} as Request;
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "assign-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.assignment.delete).toHaveBeenCalledWith({
        where: { id: "assign-1" },
      });
    });

    it("should return 404 if assignment not found", async () => {
      vi.mocked(prisma.assignment.delete).mockRejectedValue(
        new Error("Record not found"),
      );

      const request = {} as Request;
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      vi.mocked(prisma.assignment.delete).mockRejectedValue(
        new Error("DB error"),
      );

      const request = {} as Request;
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "assign-1" }),
      });

      expect(response.status).toBe(500);
    });
  });
});
