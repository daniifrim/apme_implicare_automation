import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestFilloutSubmission } from "@/lib/fillout-ingestion";
import { verifyWebhookSignature } from "@/lib/webhook";
import type { FilloutWebhookPayload, FilloutSubmission } from "@/types/fillout";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const eventType = request.headers.get("x-webhook-event");
    const eventId = request.headers.get("x-webhook-id");

    if (!signature || !eventId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 },
      );
    }

    const secret = process.env.FILLOUT_WEBHOOK_SECRET;
    if (!secret) {
      console.error("FILLOUT_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const rawBody = await request.text();

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: FilloutWebhookPayload = JSON.parse(rawBody);

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log(`Webhook event ${eventId} already processed, skipping`);
      return NextResponse.json({ status: "already_processed" });
    }

    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: eventType || payload.type,
        payload: payload as unknown as object,
        signature,
        status: "processing",
      },
    });

    if (payload.type === "record.created") {
      for (const record of payload.data.records) {
        await processSubmission(record.data as unknown as FilloutSubmission);
      }
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        status: "completed",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);

    const eventId = request.headers.get("x-webhook-id");
    if (eventId) {
      await prisma.webhookEvent
        .update({
          where: { eventId },
          data: {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            processedAt: new Date(),
          },
        })
        .catch(console.error);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function processSubmission(submissionData: FilloutSubmission) {
  const result = await ingestFilloutSubmission(submissionData, {
    formId: process.env.FILLOUT_FORM_ID ?? "pqwmkBmnpbus",
    formName: process.env.FILLOUT_FORM_NAME ?? "Implicare 2.0",
    queueSendJobs: true,
  });

  if (result.assignments.errors.length > 0) {
    console.error("Assignment errors:", result.assignments.errors);
  }

  console.log(
    `${result.created ? "Created" : "Updated"} submission ${result.databaseId} for ${result.submissionId} with ${result.assignments.created} new assignments, ${result.assignments.skipped} skipped`,
  );
}
