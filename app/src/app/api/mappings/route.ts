import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const mappings = await prisma.fieldMapping.findMany({
      include: {
        question: {
          include: {
            form: true,
          },
        },
      },
      orderBy: { canonicalKey: "asc" },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Error fetching field mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch field mappings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canonicalKey, questionId, description, isRequired } = body;

    if (!canonicalKey || !questionId) {
      return NextResponse.json(
        { error: "canonicalKey and questionId are required" },
        { status: 400 },
      );
    }

    const question = await prisma.filloutQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    const existingMapping = await prisma.fieldMapping.findUnique({
      where: { canonicalKey },
    });

    let mapping;
    let oldValue = null;

    if (existingMapping) {
      oldValue = {
        canonicalKey: existingMapping.canonicalKey,
        questionId: existingMapping.questionId,
        description: existingMapping.description,
        isRequired: existingMapping.isRequired,
      };

      mapping = await prisma.fieldMapping.update({
        where: { canonicalKey },
        data: {
          questionId,
          description: description || existingMapping.description,
          isRequired: isRequired ?? existingMapping.isRequired,
        },
        include: {
          question: {
            include: {
              form: true,
            },
          },
        },
      });

      await createAuditLog({
        userId: "system",
        action: "updated",
        resource: "mapping",
        resourceId: mapping.id,
        oldValue,
        newValue: {
          canonicalKey: mapping.canonicalKey,
          questionId: mapping.questionId,
          description: mapping.description,
          isRequired: mapping.isRequired,
          questionName: question.name,
        },
      });
    } else {
      mapping = await prisma.fieldMapping.create({
        data: {
          canonicalKey,
          questionId,
          description: description || null,
          isRequired: isRequired ?? false,
        },
        include: {
          question: {
            include: {
              form: true,
            },
          },
        },
      });

      await createAuditLog({
        userId: "system",
        action: "created",
        resource: "mapping",
        resourceId: mapping.id,
        oldValue: null,
        newValue: {
          canonicalKey: mapping.canonicalKey,
          questionId: mapping.questionId,
          description: mapping.description,
          isRequired: mapping.isRequired,
          questionName: question.name,
        },
      });
    }

    return NextResponse.json(
      { mapping },
      { status: existingMapping ? 200 : 201 },
    );
  } catch (error) {
    console.error("Error creating/updating field mapping:", error);
    return NextResponse.json(
      { error: "Failed to create/update field mapping" },
      { status: 500 },
    );
  }
}
