// ABOUTME: Generates personalized template previews for chosen submissions
// ABOUTME: Applies placeholder substitution over normalized HTML/text for fidelity checks
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  collectTemplatePlaceholders,
  normalizeEmailHtml,
} from "@/lib/email-template-normalization";

function resolvePlaceholderValue(
  submission: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    church: string | null;
    rawData: unknown;
  },
  placeholder: string,
): string {
  const raw = (submission.rawData ?? {}) as Record<string, unknown>;

  switch (placeholder) {
    case "FirstName":
      return submission.firstName ?? "";
    case "LastName":
      return submission.lastName ?? "";
    case "Email":
      return submission.email ?? "";
    case "Phone":
      return submission.phone ?? "";
    case "City":
      return submission.city ?? "";
    case "Country":
      return submission.country ?? "";
    case "Church":
      return submission.church ?? "";
    case "Missionary": {
      const v = raw["Pentru ce misionar vrei să te rogi?"];
      return typeof v === "string" ? v : "";
    }
    case "EthnicGroup": {
      const v = raw["Pentru care popor neatins vrei să te rogi?"];
      return typeof v === "string" ? v : "";
    }
    default: {
      const v = raw[placeholder];
      if (typeof v === "string") return v;
      return "";
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const { submissionId } = body;

    const [version, submission] = await Promise.all([
      prisma.templateVersion.findUnique({
        where: { id: versionId },
      }),
      submissionId
        ? prisma.submission.findUnique({
            where: { id: submissionId },
          })
        : null,
    ]);

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const normalizedContent = normalizeEmailHtml(version.htmlContent);

    let htmlContent = normalizedContent.html;
    let textContent = normalizedContent.text;
    let subject = version.subject;
    let preheader = version.preheader || "";
    const warnings = [...normalizedContent.warnings];

    const replacePlaceholders = (value: string): string =>
      value.replace(/\{\{([^{}]+)\}\}/g, (_full, placeholder: string) => {
        if (!submission) return `{{${placeholder}}}`;
        return resolvePlaceholderValue(submission, placeholder.trim());
      });

    if (submission) {
      htmlContent = replacePlaceholders(htmlContent);
      textContent = replacePlaceholders(textContent);
      subject = replacePlaceholders(subject);
      preheader = replacePlaceholders(preheader);
    }

    const unresolved = collectTemplatePlaceholders([
      htmlContent,
      textContent,
      subject,
      preheader,
    ]);
    if (unresolved.length > 0) {
      warnings.push(
        `Unresolved placeholders in preview: ${unresolved.join(", ")}`,
      );
    }

    return NextResponse.json({
      preview: {
        html: htmlContent,
        text: textContent,
        subject,
        preheader,
        placeholders: collectTemplatePlaceholders([
          version.subject,
          version.preheader,
          version.htmlContent,
          version.textContent,
          ...version.placeholders.map(
            (placeholder: string) => `{{${placeholder}}}`,
          ),
        ]),
        warnings,
        submission: submission
          ? {
              id: submission.id,
              firstName: submission.firstName,
              lastName: submission.lastName,
              email: submission.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
