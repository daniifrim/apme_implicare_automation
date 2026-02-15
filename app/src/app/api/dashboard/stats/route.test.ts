import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    submission: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    template: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    assignment: {
      count: vi.fn()
    }
  }
}))

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns dashboard stats successfully', async () => {
    // Mock all count calls
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(100) // total
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(10)  // pending
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(85)  // processed
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(5)   // failed
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(20)  // yesterday
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(15)  // day before

    vi.mocked(prisma.template.count).mockResolvedValueOnce(25)    // total
    vi.mocked(prisma.template.count).mockResolvedValueOnce(20)    // active

    vi.mocked(prisma.assignment.count).mockResolvedValueOnce(150) // total
    vi.mocked(prisma.assignment.count).mockResolvedValueOnce(30)  // pending
    vi.mocked(prisma.assignment.count).mockResolvedValueOnce(100) // completed

    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.template.findMany).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/dashboard/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.submissions).toEqual({
      total: 100,
      pending: 10,
      processed: 85,
      failed: 5,
      processingRate: 85,
      pendingRate: 10,
      trend: 33,
      yesterdayCount: 20
    })
    expect(data.stats.templates).toEqual({
      total: 25,
      active: 20
    })
    expect(data.stats.assignments).toEqual({
      total: 150,
      pending: 30,
      completed: 100
    })
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.submission.count).mockRejectedValueOnce(new Error('DB Error'))

    const request = new Request('http://localhost/api/dashboard/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch dashboard stats')
  })

  it('calculates trends correctly with zero submissions', async () => {
    vi.mocked(prisma.submission.count).mockResolvedValue(0)
    vi.mocked(prisma.template.count).mockResolvedValue(0)
    vi.mocked(prisma.assignment.count).mockResolvedValue(0)
    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.template.findMany).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/dashboard/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(data.stats.submissions.processingRate).toBe(0)
    expect(data.stats.submissions.pendingRate).toBe(0)
  })
})
