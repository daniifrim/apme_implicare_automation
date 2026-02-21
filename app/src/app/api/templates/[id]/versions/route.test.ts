// ABOUTME: Tests template version creation endpoint normalization behavior
// ABOUTME: Verifies persisted html/text/placeholders are derived from normalized content

import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "@/app/api/templates/[id]/versions/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    template: {
      findUnique: vi.fn(),
    },
    templateVersion: {
      create: vi.fn(),
    },
  },
}));

describe("POST /api/templates/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store normalized html/text/placeholders for created versions", async () => {
    vi.mocked(prisma.template.findUnique).mockResolvedValue({
      id: "tpl-1",
      versions: [{ versionNumber: 3 }],
    } as never);

    vi.mocked(prisma.templateVersion.create).mockResolvedValue({
      id: "ver-4",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/templates/tpl-1/versions", {
        method: "POST",
        body: JSON.stringify({
          name: "Version 4",
          subject: "Salut {{FirstName}}",
          preheader: "Noutati",
          editorState: [],
          htmlContent:
            '<div class="x"><p style="color:red">Hi {{FirstName}}</p><script>bad()</script></div>',
          placeholders: ["FirstName"],
        }),
      }) as never,
      { params: Promise.resolve({ id: "tpl-1" }) },
    );

    expect(response.status).toBe(201);
    expect(prisma.templateVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          htmlContent: "<p>Hi {{FirstName}}</p>",
          textContent: "Hi {{FirstName}}",
          placeholders: ["FirstName"],
        }),
      }),
    );
  });
});
