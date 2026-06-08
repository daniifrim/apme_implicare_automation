import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  void _request; // NextRequest required by Next.js App Router
  try {
    const [
      total,
      pending,
      sending,
      sent,
      failed,
      skipped,
      retrying,
      recentJobs,
    ] = await Promise.all([
      prisma.sendJob.count(),
      prisma.sendJob.count({ where: { status: "pending" } }),
      prisma.sendJob.count({ where: { status: "sending" } }),
      prisma.sendJob.count({ where: { status: "sent" } }),
      prisma.sendJob.count({ where: { status: "failed" } }),
      prisma.sendJob.count({ where: { status: "skipped" } }),
      prisma.sendJob.count({ where: { status: "retrying" } }),
      prisma.sendJob.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          submission: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          template: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      counts: {
        total,
        pending,
        sending,
        sent,
        failed,
        skipped,
        retrying,
      },
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        email: job.email,
        templateName: job.templateName,
        status: job.status,
        retryCount: job.retryCount,
        lastError: job.lastError,
        sentAt: job.sentAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        submissionId: job.submissionId,
        submissionName:
          job.submission?.firstName && job.submission?.lastName
            ? `${job.submission.firstName} ${job.submission.lastName}`
            : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching send job stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch send job stats" },
      { status: 500 },
    );
  }
}
