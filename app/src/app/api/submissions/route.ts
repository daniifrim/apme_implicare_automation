import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const locationType = searchParams.get("location");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (locationType) {
      where.locationType = locationType;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { submissionId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (fromDate || toDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (fromDate) {
        dateFilter.gte = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day for inclusive filtering
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }
      where.submissionTime = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submissionTime: "desc" },
        include: {
          assignments: {
            include: {
              template: true,
              version: true,
            },
          },
          answers: {
            include: {
              question: true,
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
