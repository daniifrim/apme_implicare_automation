import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/webhook'
import { normalizeSubmission } from '@/lib/normalize'
import { createAssignmentsForSubmission, markSubmissionAsProcessed } from '@/lib/assignments'
import type { FilloutWebhookPayload, FilloutSubmission } from '@/types/fillout'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-webhook-signature')
    const eventType = request.headers.get('x-webhook-event')
    const eventId = request.headers.get('x-webhook-id')
    
    if (!signature || !eventId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      )
    }

    const secret = process.env.FILLOUT_WEBHOOK_SECRET
    if (!secret) {
      console.error('FILLOUT_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    const rawBody = await request.text()

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload: FilloutWebhookPayload = JSON.parse(rawBody)

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId }
    })

    if (existingEvent) {
      console.log(`Webhook event ${eventId} already processed, skipping`)
      return NextResponse.json({ status: 'already_processed' })
    }

    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: eventType || payload.type,
        payload: payload as unknown as Prisma.InputJsonValue,
        signature,
        status: 'processing'
      }
    })

    if (payload.type === 'record.created') {
      for (const record of payload.data.records) {
        await processSubmission(record.data as unknown as FilloutSubmission)
      }
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        status: 'completed',
        processedAt: new Date()
      }
    })

    return NextResponse.json({ status: 'success' })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    const eventId = request.headers.get('x-webhook-id')
    if (eventId) {
      await prisma.webhookEvent.update({
        where: { eventId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        }
      }).catch(console.error)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processSubmission(submissionData: FilloutSubmission) {
  const normalized = normalizeSubmission(submissionData)

  const existingSubmission = await prisma.submission.findUnique({
    where: { submissionId: normalized.submissionId }
  })

  if (existingSubmission) {
    console.log(`Submission ${normalized.submissionId} already exists, updating`)
    
    await prisma.submission.update({
      where: { submissionId: normalized.submissionId },
      data: {
        email: normalized.email,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        phone: normalized.phone,
        locationType: normalized.locationType,
        city: normalized.city,
        country: normalized.country,
        church: normalized.church,
        rawData: normalized.rawData as unknown as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    })

    await prisma.submissionAnswer.deleteMany({
      where: { submissionId: existingSubmission.id }
    })

    for (const answer of normalized.answers) {
      await prisma.submissionAnswer.create({
        data: {
          submissionId: existingSubmission.id,
          questionId: answer.questionId,
          value: answer.value,
          rawValue: answer.rawValue as Prisma.InputJsonValue
        }
      })
    }

    // Re-process assignments for existing submission (in case data changed)
    const assignmentResult = await createAssignmentsForSubmission(
      existingSubmission.id,
      normalized
    )

    if (assignmentResult.errors.length > 0) {
      console.error('Assignment errors for existing submission:', assignmentResult.errors)
    }

    // Mark as processed (even if partially failed)
    await markSubmissionAsProcessed(existingSubmission.id)

    console.log(`Updated submission ${existingSubmission.id} with ${assignmentResult.created} new assignments, ${assignmentResult.skipped} skipped`)
    return
  }

  const submission = await prisma.submission.create({
    data: {
      submissionId: normalized.submissionId,
      submissionTime: normalized.submissionTime,
      email: normalized.email,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      phone: normalized.phone,
      locationType: normalized.locationType,
      city: normalized.city,
      country: normalized.country,
      church: normalized.church,
      rawData: normalized.rawData as unknown as Prisma.InputJsonValue,
      status: 'pending'
    }
  })

  for (const answer of normalized.answers) {
    await prisma.submissionAnswer.create({
      data: {
        submissionId: submission.id,
        questionId: answer.questionId,
        value: answer.value,
        rawValue: answer.rawValue as unknown as Prisma.InputJsonValue
      }
    })
  }

  // Create template assignments based on submission answers
  const assignmentResult = await createAssignmentsForSubmission(submission.id, normalized)

  if (assignmentResult.errors.length > 0) {
    console.error('Assignment errors:', assignmentResult.errors)
  }

  // Mark submission as processed
  await markSubmissionAsProcessed(submission.id)

  console.log(`Created submission ${submission.id} for ${normalized.submissionId} with ${assignmentResult.created} assignments`)
}
