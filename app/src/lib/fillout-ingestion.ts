// ABOUTME: Ingests Fillout submissions into the database with stable form/question mapping
// ABOUTME: Shares the direct Fillout API and webhook persistence path before assignment creation
import { prisma } from "@/lib/prisma";
import { normalizeSubmission } from "@/lib/normalize";
import {
  createAssignmentsForSubmission,
  markSubmissionAsProcessed,
  type AssignmentCreationOptions,
  type AssignmentCreationResult,
} from "@/lib/assignments";
import type { FilloutSubmission } from "@/types/fillout";

export interface FilloutIngestionOptions extends AssignmentCreationOptions {
  formId: string;
  formName?: string;
}

export interface FilloutIngestionResult {
  submissionId: string;
  databaseId: string;
  created: boolean;
  answersStored: number;
  assignments: AssignmentCreationResult;
}

export async function ingestFilloutSubmission(
  submissionData: FilloutSubmission,
  options: FilloutIngestionOptions,
): Promise<FilloutIngestionResult> {
  const normalized = normalizeSubmission(submissionData);
  const form = await prisma.filloutForm.upsert({
    where: { formId: options.formId },
    update: {
      name: options.formName ?? options.formId,
      status: "active",
    },
    create: {
      formId: options.formId,
      name: options.formName ?? options.formId,
      status: "active",
    },
  });

  const questionIdsByFilloutId = new Map<string, string>();
  for (const [index, question] of submissionData.questions.entries()) {
    const persistedQuestion = await prisma.filloutQuestion.upsert({
      where: {
        questionId_formId: {
          questionId: question.id,
          formId: form.id,
        },
      },
      update: {
        name: question.name,
        type: question.type,
        order: index,
      },
      create: {
        questionId: question.id,
        formId: form.id,
        name: question.name,
        type: question.type,
        order: index,
      },
    });
    questionIdsByFilloutId.set(question.id, persistedQuestion.id);
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: { submissionId: normalized.submissionId },
  });

  const submission = existingSubmission
    ? await prisma.submission.update({
        where: { submissionId: normalized.submissionId },
        data: {
          formId: form.id,
          submissionTime: normalized.submissionTime,
          email: normalized.email,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          phone: normalized.phone,
          locationType: normalized.locationType,
          city: normalized.city,
          country: normalized.country,
          church: normalized.church,
          rawData: normalized.rawData as unknown as object,
          updatedAt: new Date(),
        },
      })
    : await prisma.submission.create({
        data: {
          submissionId: normalized.submissionId,
          formId: form.id,
          submissionTime: normalized.submissionTime,
          email: normalized.email,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          phone: normalized.phone,
          locationType: normalized.locationType,
          city: normalized.city,
          country: normalized.country,
          church: normalized.church,
          rawData: normalized.rawData as unknown as object,
          status: "pending",
        },
      });

  if (existingSubmission) {
    await prisma.submissionAnswer.deleteMany({
      where: { submissionId: submission.id },
    });
  }

  let answersStored = 0;
  for (const answer of normalized.answers) {
    const questionId = questionIdsByFilloutId.get(answer.questionId);
    if (!questionId) continue;

    await prisma.submissionAnswer.create({
      data: {
        submissionId: submission.id,
        questionId,
        value: answer.value,
        rawValue: answer.rawValue as unknown as object,
      },
    });
    answersStored++;
  }

  const assignments = await createAssignmentsForSubmission(
    submission.id,
    normalized,
    { queueSendJobs: options.queueSendJobs ?? true },
  );

  await markSubmissionAsProcessed(submission.id);

  return {
    submissionId: normalized.submissionId,
    databaseId: submission.id,
    created: !existingSubmission,
    answersStored,
    assignments,
  };
}
