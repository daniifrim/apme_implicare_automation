// ABOUTME: Tests template preview endpoint normalization and placeholder substitution logic
// ABOUTME: Ensures preview output reflects sanitized HTML with submission data replacements

import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "@/app/api/templates/[id]/versions/[versionId]/preview/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    templateVersion: {
      findUnique: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/templates/[id]/versions/[versionId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return normalized preview and apply submission placeholders", async () => {
    vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue({
      id: "ver-1",
      subject: "Salut {{FirstName}}",
      preheader: "Mesaj pentru {{City}}",
      htmlContent:
        '<div class="x"><p>Buna {{FirstName}}</p><script>bad()</script></div>',
      textContent: null,
      placeholders: ["FirstName", "City"],
    } as never);

    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      id: "sub-1",
      firstName: "Ana",
      lastName: "Pop",
      email: "ana@example.com",
      phone: null,
      city: "Cluj",
      country: null,
      church: null,
      rawData: {},
    } as never);

    const response = await POST(
      new Request(
        "http://localhost/api/templates/tpl-1/versions/ver-1/preview",
        {
          method: "POST",
          body: JSON.stringify({ submissionId: "sub-1" }),
        },
      ) as never,
      { params: Promise.resolve({ id: "tpl-1", versionId: "ver-1" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview.html).toBe("<p>Buna Ana</p>");
    expect(body.preview.subject).toBe("Salut Ana");
    expect(body.preview.preheader).toBe("Mesaj pentru Cluj");
    expect(body.preview.text).toBe("Buna Ana");
    expect(Array.isArray(body.preview.warnings)).toBe(true);
  });

  it("should keep placeholders unresolved when no submission is selected", async () => {
    vi.mocked(prisma.templateVersion.findUnique).mockResolvedValue({
      id: "ver-1",
      subject: "Salut {{FirstName}}",
      preheader: null,
      htmlContent: "<p>Buna {{FirstName}}</p>",
      textContent: null,
      placeholders: ["FirstName"],
    } as never);

    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost/api/templates/tpl-1/versions/ver-1/preview",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ) as never,
      { params: Promise.resolve({ id: "tpl-1", versionId: "ver-1" }) },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview.html).toContain("{{FirstName}}");
    expect(
      body.preview.warnings.some((warning: string) =>
        warning.includes("Unresolved placeholders"),
      ),
    ).toBe(true);
  });
});
