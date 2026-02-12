import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/submissions/[id]/route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    submission: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

describe('Submission Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/submissions/[id]', () => {
    it('should return submission with assignments and answers', async () => {
      const mockSubmission = {
        id: 'sub-123',
        submissionId: 'external-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: 'processed',
        assignments: [
          { id: 'assign-1', template: { name: 'Template 1' }, status: 'pending' }
        ],
        answers: [
          { id: 'ans-1', question: { name: 'Q1' }, value: 'A1' }
        ]
      }

      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never)

      const request = new Request('http://localhost/api/submissions/sub-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'sub-123' }) })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.id).toBe('sub-123')
      expect(body.assignments).toHaveLength(1)
      expect(body.answers).toHaveLength(1)
    })

    it('should return 404 if submission not found', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/submissions/nonexistent')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error).toBe('Submission not found')
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.submission.findUnique).mockRejectedValue(new Error('DB error'))

      const request = new Request('http://localhost/api/submissions/sub-123')
      const response = await GET(request, { params: Promise.resolve({ id: 'sub-123' }) })

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/submissions/[id]', () => {
    it('should update submission fields', async () => {
      const mockSubmission = {
        id: 'sub-123',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'Name',
        status: 'processed'
      }

      vi.mocked(prisma.submission.update).mockResolvedValue(mockSubmission as never)

      const request = new Request('http://localhost/api/submissions/sub-123', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: 'New',
          lastName: 'Name',
          email: 'new@example.com',
          status: 'processed'
        })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sub-123' }) })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          first_name: 'New',
          last_name: 'Name',
          email: 'new@example.com',
          status: 'processed'
        },
        include: expect.any(Object)
      })
    })

    it('should handle empty strings as null', async () => {
      vi.mocked(prisma.submission.update).mockResolvedValue({ id: 'sub-123' } as never)

      const request = new Request('http://localhost/api/submissions/sub-123', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: '',
          lastName: 'Name'
        })
      })

      await PATCH(request, { params: Promise.resolve({ id: 'sub-123' }) })

      expect(prisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            first_name: null,
            last_name: 'Name'
          })
        })
      )
    })

    it('should return 404 if submission not found', async () => {
      vi.mocked(prisma.submission.update).mockRejectedValue(new Error('Record not found'))

      const request = new Request('http://localhost/api/submissions/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'New' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(response.status).toBe(404)
    })

    it('should only update allowed fields', async () => {
      vi.mocked(prisma.submission.update).mockResolvedValue({ id: 'sub-123' } as never)

      const request = new Request('http://localhost/api/submissions/sub-123', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: 'New',
          hackerField: 'should be ignored',
          anotherBadField: 'also ignored'
        })
      })

      await PATCH(request, { params: Promise.resolve({ id: 'sub-123' }) })

      expect(prisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            hackerField: expect.anything(),
            anotherBadField: expect.anything()
          })
        })
      )
    })
  })
})
