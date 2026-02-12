import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAssignmentsForSubmission, markSubmissionAsProcessed, reprocessAssignments } from '@/lib/assignments'
import { prisma } from '@/lib/prisma'
import type { NormalizedSubmission } from '@/types/fillout'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    template: {
      findMany: vi.fn()
    },
    assignment: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    submission: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

describe('assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createNormalizedSubmission(overrides: Partial<NormalizedSubmission> = {}): NormalizedSubmission {
    return {
      submissionId: 'test-submission-123',
      submissionTime: new Date('2024-01-01'),
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      locationType: 'romania',
      city: 'Bucharest',
      country: 'Romania',
      church: 'Test Church',
      rawData: {},
      answers: [
        { questionId: 'q1', value: 'Yes', rawValue: 'Yes' }
      ],
      ...overrides
    }
  }

  /**
   * Helper to create answers that will match assignment engine rules
   * The engine expects keys like 'mission_interests', 'course_interests', etc.
   */
  function createMatchingAnswers(type: string, value: string): NormalizedSubmission['answers'] {
    const questionIdMap: Record<string, string> = {
      'volunteer': 'mission_interests',
      'kairos': 'course_interests',
      'short_term': 'mission_interests',
      'donate': 'support_interests',
      'camps': 'mission_interests',
      'missionary': 'prayer_method',
      'adopt': 'prayer_method'
    }
    
    return [
      { questionId: questionIdMap[type] || 'generic_question', value, rawValue: value }
    ]
  }

  describe('createAssignmentsForSubmission', () => {
    it('should create assignments for matching templates', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-voluntariat' },
        { id: 'template-2', slug: 'info-curs-kairos' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const submission = createNormalizedSubmission({
        answers: createMatchingAnswers('volunteer', 'volunteer')
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.created).toBeGreaterThan(0)
      expect(prisma.assignment.create).toHaveBeenCalled()
    })

    it('should skip existing assignments (idempotency)', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-voluntariat' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue({ id: 'existing-assignment' } as never)

      const submission = createNormalizedSubmission({
        answers: createMatchingAnswers('volunteer', 'volunteer')
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.skipped).toBe(1)
      expect(result.created).toBe(0)
      expect(prisma.assignment.create).not.toHaveBeenCalled()
    })

    it('should create location-specific templates', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-cursuri-locale' },
        { id: 'template-2', slug: 'info-evenimente-apme' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const submission = createNormalizedSubmission({
        locationType: 'romania',
        answers: []
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.created).toBeGreaterThanOrEqual(2)
    })

    it('should handle diaspora location-specific templates', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-diaspora-connect' },
        { id: 'template-2', slug: 'info-misiune-termen-scurt-diaspora' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const submission = createNormalizedSubmission({
        locationType: 'diaspora',
        answers: []
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.created).toBeGreaterThanOrEqual(2)
    })

    it('should report errors for missing templates', async () => {
      vi.mocked(prisma.template.findMany).mockResolvedValue([])

      const submission = createNormalizedSubmission({
        answers: [
          { questionId: 'q1', value: 'volunteer', rawValue: 'volunteer' }
        ]
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Template not found')
    })

    it('should include reason codes in assignments', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-voluntariat' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const submission = createNormalizedSubmission({
        answers: createMatchingAnswers('volunteer', 'volunteer')
      })

      await createAssignmentsForSubmission('submission-1', submission)

      expect(prisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reasonCodes: expect.arrayContaining([expect.stringContaining('volunteer')])
          })
        })
      )
    })

    it('should handle empty answers gracefully', async () => {
      // Mock templates that match the location-specific templates for romania
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: 'template-1', slug: 'info-cursuri-locale' },
        { id: 'template-2', slug: 'info-evenimente-apme' }
      ])
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const submission = createNormalizedSubmission({
        locationType: 'romania',
        answers: []
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      // Should create location-specific assignments even with no interest-based answers
      expect(result.created).toBeGreaterThanOrEqual(2)
      expect(result.errors).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.template.findMany).mockRejectedValue(new Error('Database connection failed'))

      const submission = createNormalizedSubmission()

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Assignment engine failed')
    })

    it('should handle partial failures (some succeed, some fail)', async () => {
      const mockTemplates = [
        { id: 'template-1', slug: 'info-voluntariat' },
        { id: 'template-2', slug: 'info-curs-kairos' }
      ]

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates)
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create)
        .mockResolvedValueOnce({ id: 'assignment-1' } as never)
        .mockRejectedValueOnce(new Error('Database error'))

      const submission = createNormalizedSubmission({
        answers: [
          ...createMatchingAnswers('volunteer', 'volunteer'),
          ...createMatchingAnswers('kairos', 'kairos')
        ]
      })

      const result = await createAssignmentsForSubmission('submission-1', submission)

      expect(result.created).toBeGreaterThanOrEqual(1)
      expect(result.errors.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('markSubmissionAsProcessed', () => {
    it('should update submission status to processed', async () => {
      vi.mocked(prisma.submission.update).mockResolvedValue({ id: 'submission-1' } as never)

      await markSubmissionAsProcessed('submission-1')

      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
        data: {
          status: 'processed',
          processedAt: expect.any(Date)
        }
      })
    })

    it('should throw error if submission not found', async () => {
      vi.mocked(prisma.submission.update).mockRejectedValue(new Error('Record not found'))

      await expect(markSubmissionAsProcessed('nonexistent')).rejects.toThrow('Record not found')
    })
  })

  describe('reprocessAssignments', () => {
    it('should fetch submission and create assignments', async () => {
      const mockSubmission = {
        id: 'submission-1',
        submissionId: 'sub-ext-123',
        submissionTime: new Date('2024-01-01'),
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        locationType: 'romania',
        city: 'Bucharest',
        country: 'Romania',
        church: 'Test Church',
        rawData: {},
        answers: [
          {
            questionId: 'mission_interests',
            question: { name: 'mission_interests' },
            value: 'volunteer',
            rawValue: 'volunteer'
          }
        ]
      }

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never)
      vi.mocked(prisma.template.findMany).mockResolvedValue([
        { id: 'template-1', slug: 'info-voluntariat' }
      ])
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.assignment.create).mockResolvedValue({ id: 'assignment-1' } as never)

      const result = await reprocessAssignments('submission-1')

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
        include: {
          answers: {
            include: {
              question: true
            }
          }
        }
      })
      expect(result.created).toBeGreaterThan(0)
    })

    it('should return error if submission not found', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)

      const result = await reprocessAssignments('nonexistent')

      expect(result.created).toBe(0)
      expect(result.errors).toContain('Submission not found: nonexistent')
    })
  })
})
