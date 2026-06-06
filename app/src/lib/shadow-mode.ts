// ABOUTME: Shadow-mode decision engine that compares app-assigned templates with legacy email history
// ABOUTME: Computes shadow decisions without sending emails, storing comparison results for auditing

import { prisma } from "@/lib/prisma";
import { assignmentEngine } from "@/lib/assignment-engine";

export interface ShadowDecisionResult {
  id: string;
  submissionId: string | null;
  email: string;
  appTemplateSlugs: string[];
  appTemplateNames: string[];
  legacyTemplateNames: string[];
  status: "match" | "mismatch" | "missing_legacy" | "not_comparable";
  reasonCodes: string[];
  createdAt: Date;
}

export async function computeShadowDecision(submissionId: string): Promise<ShadowDecisionResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { answers: { include: { question: true } } },
  });

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  if (!submission.email) {
    const created = await prisma.shadowDecision.create({
      data: {
        submissionId,
        email: "",
        appTemplateSlugs: [],
        legacyTemplateNames: [],
        status: "not_comparable",
        reasonCodes: ["no_email"],
      },
    });
    return {
      id: created.id,
      submissionId: created.submissionId,
      email: created.email,
      appTemplateSlugs: created.appTemplateSlugs as string[],
      appTemplateNames: [],
      legacyTemplateNames: created.legacyTemplateNames as string[],
      status: created.status as ShadowDecisionResult["status"],
      reasonCodes: created.reasonCodes as string[],
      createdAt: created.createdAt,
    };
  }

  const normalizedSubmission = assignmentEngine.normalizeSubmission(submission);
  const assignmentResults = assignmentEngine.assignTemplates(normalizedSubmission);
  const appTemplateSlugs = assignmentResults.map(r => r.templateSlug);

  const templates = await prisma.template.findMany({
    where: { slug: { in: appTemplateSlugs } },
  });
  const appTemplateNames = templates.map(t => t.name);

  const legacyHistory = await prisma.legacyEmailHistory.findMany({
    where: { email: submission.email, status: "SENT" },
  });
  const legacyTemplateNames = [...new Set(legacyHistory.map(h => h.templateName))];

  let status: ShadowDecisionResult["status"];
  let reasonCodes: string[];

  if (legacyTemplateNames.length === 0) {
    status = "missing_legacy";
    reasonCodes = ["no_legacy_history"];
  } else {
    const appNamesLower = new Set(appTemplateNames.map(n => n.toLowerCase()));
    const legacyNamesLower = new Set(legacyTemplateNames.map(n => n.toLowerCase()));

    const appOnly = appTemplateNames.filter(n => !legacyNamesLower.has(n.toLowerCase()));
    const legacyOnly = legacyTemplateNames.filter(n => !appNamesLower.has(n.toLowerCase()));

    if (appOnly.length === 0 && legacyOnly.length === 0) {
      status = "match";
      reasonCodes = ["templates_match"];
    } else {
      status = "mismatch";
      reasonCodes = [
        "template_mismatch",
        `app_only: ${JSON.stringify(appOnly)}`,
        `legacy_only: ${JSON.stringify(legacyOnly)}`,
      ];
    }
  }

  const created = await prisma.shadowDecision.create({
    data: {
      submissionId,
      email: submission.email,
      appTemplateSlugs,
      legacyTemplateNames,
      status,
      reasonCodes,
    },
  });

  return {
    id: created.id,
    submissionId: created.submissionId,
    email: created.email,
    appTemplateSlugs: created.appTemplateSlugs as string[],
    appTemplateNames,
    legacyTemplateNames: created.legacyTemplateNames as string[],
    status: created.status as ShadowDecisionResult["status"],
    reasonCodes: created.reasonCodes as string[],
    createdAt: created.createdAt,
  };
}

export async function getShadowDecisionsForEmail(email: string): Promise<ShadowDecisionResult[]> {
  const decisions = await prisma.shadowDecision.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  return decisions.map(d => ({
    id: d.id,
    submissionId: d.submissionId,
    email: d.email,
    appTemplateSlugs: d.appTemplateSlugs as string[],
    appTemplateNames: [],
    legacyTemplateNames: d.legacyTemplateNames as string[],
    status: d.status as ShadowDecisionResult["status"],
    reasonCodes: d.reasonCodes as string[],
    createdAt: d.createdAt,
  }));
}

export async function getMismatchReport(): Promise<ShadowDecisionResult[]> {
  const decisions = await prisma.shadowDecision.findMany({
    where: { status: "mismatch" },
    orderBy: { createdAt: "desc" },
  });
  return decisions.map(d => ({
    id: d.id,
    submissionId: d.submissionId,
    email: d.email,
    appTemplateSlugs: d.appTemplateSlugs as string[],
    appTemplateNames: [],
    legacyTemplateNames: d.legacyTemplateNames as string[],
    status: d.status as ShadowDecisionResult["status"],
    reasonCodes: d.reasonCodes as string[],
    createdAt: d.createdAt,
  }));
}
