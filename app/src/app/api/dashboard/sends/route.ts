// ABOUTME: API route for send-job dashboard queue statistics and recent jobs
// ABOUTME: Reports only actionable future sends as pending work

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAlreadySentPendingSendJobReasons } from "@/lib/send-job-actionability";

export async function GET(_request: NextRequest) {
  void _request; // NextRequest required by Next.js App Router
  try {
    const [
      total,
      sending,
      sent,
      failed,
      skipped,
      retrying,
      pendingJobs,
      recentJobs,
    ] = await Promise.all([
      prisma.sendJob.count(),
      prisma.sendJob.count({ where: { status: "sending" } }),
      prisma.sendJob.count({ where: { status: "sent" } }),
      prisma.sendJob.count({ where: { status: "failed" } }),
      prisma.sendJob.count({ where: { status: "skipped" } }),
      prisma.sendJob.count({ where: { status: "retrying" } }),
      prisma.sendJob.findMany({
        where: { status: "pending" },
        select: {
          id: true,
          submissionId: true,
          templateId: true,
          email: true,
          templateName: true,
          submission: {
            select: {
              submissionId: true,
              rawData: true,
            },
          },
        },
      }),
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

    const alreadySentReasons = await findAlreadySentPendingSendJobReasons(
      pendingJobs,
    );
    const pending = pendingJobs.length - alreadySentReasons.size;
    const skippedCount = skipped + alreadySentReasons.size;

    return NextResponse.json({
      counts: {
        total,
        pending,
        sending,
        sent,
        failed,
        skipped: skippedCount,
        retrying,
      },
      recentJobs: recentJobs.map((job) => {
        const alreadySentReason = alreadySentReasons.get(job.id) ?? null;

        return {
          id: job.id,
          email: job.email,
          templateName: job.templateName,
          status: alreadySentReason ? "skipped" : job.status,
          retryCount: job.retryCount,
          lastError: alreadySentReason ?? job.lastError,
          sentAt: job.sentAt?.toISOString() ?? null,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          submissionId: job.submissionId,
          submissionName:
            job.submission?.firstName && job.submission?.lastName
              ? `${job.submission.firstName} ${job.submission.lastName}`
              : null,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching send job stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch send job stats" },
      { status: 500 },
    );
  }
}
