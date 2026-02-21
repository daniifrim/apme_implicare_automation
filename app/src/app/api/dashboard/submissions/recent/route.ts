import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SubmissionWithAssignments {
  id: string;
  submissionId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  submissionTime: Date;
  createdAt: Date;
  locationType: string | null;
  city: string | null;
  country: string | null;
  assignments: Array<{
    status: string;
    template: {
      id: string;
      slug: string;
      name: string;
    } | null;
    version: {
      id: string;
      versionNumber: number;
      subject: string;
    } | null;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Max 50

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        skip,
        take: limit,
        orderBy: { submissionTime: "desc" },
        include: {
          assignments: {
            include: {
              template: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
              version: {
                select: {
                  id: true,
                  versionNumber: true,
                  subject: true,
                },
              },
            },
          },
        },
      }),
      prisma.submission.count(),
    ]);

    // Transform submissions to include computed fields
    const transformedSubmissions = submissions.map(
      (sub: SubmissionWithAssignments) => ({
        id: sub.id,
        submissionId: sub.submissionId,
        email: sub.email,
        firstName: sub.firstName,
        lastName: sub.lastName,
        status: sub.status,
        submissionTime: sub.submissionTime,
        createdAt: sub.createdAt,
        locationType: sub.locationType,
        city: sub.city,
        country: sub.country,
        assignmentCount: sub.assignments.length,
        templates: sub.assignments
          .map((a: SubmissionWithAssignments["assignments"][0]) => ({
            id: a.template?.id,
            name: a.template?.name,
            slug: a.template?.slug,
            status: a.status,
          }))
          .filter(Boolean),
      }),
    );

    return NextResponse.json({
      submissions: transformedSubmissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching recent submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent submissions" },
      { status: 500 },
    );
  }
}
