import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 },
      );
    }

    // Verify template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        submissionId_templateId: {
          submissionId: id,
          templateId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Assignment already exists for this template" },
        { status: 409 },
      );
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        submissionId: id,
        templateId,
        status: "pending",
        reasonCodes: ["manual"],
      },
      include: {
        template: true,
        version: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);

    if (error instanceof Error && error.message.includes("Record not found")) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 },
    );
  }
}
