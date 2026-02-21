import { NextRequest, NextResponse } from "next/server";
import { reprocessAssignments } from "@/lib/assignments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionIds } = body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: "submissionIds array is required" },
        { status: 400 },
      );
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each submission
    for (const submissionId of submissionIds) {
      try {
        const result = await reprocessAssignments(submissionId);

        if (result.errors.length > 0) {
          results.failed++;
          results.errors.push(
            `Submission ${submissionId}: ${result.errors.join(", ")}`,
          );
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Submission ${submissionId}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      failed: results.failed,
      total: submissionIds.length,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk reprocess error:", error);
    return NextResponse.json(
      { error: "Failed to process submissions" },
      { status: 500 },
    );
  }
}
