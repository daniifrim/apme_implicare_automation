import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/webhooks/fillout/route'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/webhook'
import { createAssignmentsForSubmission, markSubmissionAsProcessed } from '@/lib/assignments'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    submission: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    submissionAnswer: {
      deleteMany: vi.fn(),
      create: vi.fn()
    }
  }
}))

vi.mock('@/lib/webhook', () => ({
  verifyWebhookSignature: vi.fn()
}))

vi.mock('@/lib/assignments', () => ({
  createAssignmentsForSubmission: vi.fn(),
  markSubmissionAsProcessed: vi.fn()
}))

const mockEnv = (secret: string | undefined) => {
  process.env.FILLOUT_WEBHOOK_SECRET = secret
}

describe('POST /api/webhooks/fillout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv('test-secret')
  })

  function createMockRequest(body: object, headers: Record<string, string> = {}) {
    return {
      text: () => Promise.resolve(JSON.stringify(body)),
      headers: {
        get: (name: string) => headers[name] || null
      }
    } as unknown as Request
  }

  const validHeaders = {
    'x-webhook-signature': 'valid-signature',
    'x-webhook-id': 'event-123',
    'x-webhook-event': 'record.created'
  }

  const validPayload = {
    type: 'record.created',
    data: {
      records: [{
        data: {
          submissionId: 'sub-123',
          submissionTime: '2024-01-01T00:00:00Z',
          questions: [
            { id: 'q1', name: 'Email', value: 'test@example.com', type: 'EmailInput' },
            { id: 'q2', name: 'Cum te numești?', value: 'Test User', type: 'TextInput' }
          ]
        }
      }]
    }
  }

  it('should return 400 if missing required headers', async () => {
    const request = createMockRequest(validPayload, {})
    
    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing required headers')
  })

  it('should return 500 if webhook secret not configured', async () => {
    // Remove the env variable completely
    delete process.env.FILLOUT_WEBHOOK_SECRET
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Webhook secret not configured')
    
    // Restore the env variable for other tests
    process.env.FILLOUT_WEBHOOK_SECRET = 'test-secret'
  })

  it('should return 401 if signature is invalid', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false)
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Invalid signature')
  })

  it('should skip already processed events', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue({ id: 'existing' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('already_processed')
  })

  it('should process new submission and create assignments', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: 'submission-1' } as never)
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({ id: 'answer-1' } as never)
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
      created: 2,
      skipped: 0,
      errors: []
    })
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined)
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('success')
    
    expect(createAssignmentsForSubmission).toHaveBeenCalled()
    expect(markSubmissionAsProcessed).toHaveBeenCalled()
  })

  it('should update existing submission and re-process assignments', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue({
      id: 'existing-submission',
      submissionId: 'sub-123'
    } as never)
    vi.mocked(prisma.submission.update).mockResolvedValue({ id: 'existing-submission' } as never)
    vi.mocked(prisma.submissionAnswer.deleteMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({ id: 'answer-1' } as never)
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
      created: 1,
      skipped: 1,
      errors: []
    })
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined)
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    expect(prisma.submission.update).toHaveBeenCalled()
    expect(createAssignmentsForSubmission).toHaveBeenCalled()
    expect(markSubmissionAsProcessed).toHaveBeenCalled()
  })

  it('should handle assignment creation errors gracefully', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: 'submission-1' } as never)
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({ id: 'answer-1' } as never)
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: ['Template not found: missing-template']
    })
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined)
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    // Should still succeed even with assignment errors
    expect(response.status).toBe(200)
    expect(markSubmissionAsProcessed).toHaveBeenCalled()
  })

  it('should handle JSON parse errors', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = {
      text: () => Promise.resolve('invalid json'),
      headers: {
        get: (name: string) => validHeaders[name] || null
      }
    } as unknown as Request
    
    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should update webhook event status on completion', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create).mockResolvedValue({ id: 'submission-1' } as never)
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({ id: 'answer-1' } as never)
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({ created: 1, skipped: 0, errors: [] })
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined)
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    await POST(request)
    
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { eventId: 'event-123' },
      data: {
        status: 'completed',
        processedAt: expect.any(Date)
      }
    })
  })

  it('should update webhook event status on failure', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockRejectedValue(new Error('Database error'))
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const request = createMockRequest(validPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { eventId: 'event-123' },
      data: {
        status: 'failed',
        errorMessage: 'Database error',
        processedAt: expect.any(Date)
      }
    })
  })

  it('should handle multiple records in webhook payload', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({ id: 'event-123' } as never)
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.submission.create)
      .mockResolvedValueOnce({ id: 'submission-1' } as never)
      .mockResolvedValueOnce({ id: 'submission-2' } as never)
    vi.mocked(prisma.submissionAnswer.create).mockResolvedValue({ id: 'answer-1' } as never)
    vi.mocked(createAssignmentsForSubmission).mockResolvedValue({ created: 1, skipped: 0, errors: [] })
    vi.mocked(markSubmissionAsProcessed).mockResolvedValue(undefined)
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({ id: 'event-123' } as never)
    
    const multiRecordPayload = {
      type: 'record.created',
      data: {
        records: [
          {
            data: {
              submissionId: 'sub-1',
              submissionTime: '2024-01-01T00:00:00Z',
              questions: [{ id: 'q1', name: 'Email', value: 'test1@example.com', type: 'EmailInput' }]
            }
          },
          {
            data: {
              submissionId: 'sub-2',
              submissionTime: '2024-01-01T00:00:00Z',
              questions: [{ id: 'q1', name: 'Email', value: 'test2@example.com', type: 'EmailInput' }]
            }
          }
        ]
      }
    }
    
    const request = createMockRequest(multiRecordPayload, validHeaders)
    
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    expect(prisma.submission.create).toHaveBeenCalledTimes(2)
    expect(createAssignmentsForSubmission).toHaveBeenCalledTimes(2)
  })
})
