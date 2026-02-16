import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    submission: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}))

describe('GET /api/dashboard/submissions/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns recent submissions with pagination', async () => {
    const mockSubmissions = [
      {
        id: '1',
        submissionId: 'sub-001',
        email: 'test1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'pending',
        submissionTime: new Date('2024-01-15'),
        createdAt: new Date('2024-01-15'),
        locationType: 'local',
        city: 'Bucharest',
        country: 'Romania',
        assignments: [
          {
            template: { id: 't1', slug: 'welcome', name: 'Welcome Email' },
            version: { id: 'v1', versionNumber: 1, subject: 'Welcome!' },
            status: 'pending'
          }
        ]
      },
      {
        id: '2',
        submissionId: 'sub-002',
        email: 'test2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'processed',
        submissionTime: new Date('2024-01-14'),
        createdAt: new Date('2024-01-14'),
        locationType: 'international',
        city: 'London',
        country: 'UK',
        assignments: []
      }
    ]

    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce(mockSubmissions as unknown as Awaited<ReturnType<typeof prisma.submission.findMany>>)
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(100)

    const request = new Request('http://localhost/api/dashboard/submissions/recent?page=1&limit=10')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.submissions).toHaveLength(2)
    expect(data.submissions[0]).toMatchObject({
      id: '1',
      email: 'test1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'pending',
      assignmentCount: 1
    })
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 100,
      pages: 10,
      hasMore: true
    })
  })

  it('respects custom pagination params', async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(50)

    const request = new Request('http://localhost/api/dashboard/submissions/recent?page=2&limit=5')
    const response = await GET(request)
    const data = await response.json()

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5
      })
    )
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(5)
  })

  it('limits max results to 50', async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(100)

    const request = new Request('http://localhost/api/dashboard/submissions/recent?limit=100')
    await GET(request)

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50
      })
    )
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.submission.findMany).mockRejectedValueOnce(new Error('DB Error'))

    const request = new Request('http://localhost/api/dashboard/submissions/recent')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch recent submissions')
  })

  it('transforms submissions correctly', async () => {
    const mockSubmission = {
      id: '1',
      submissionId: 'sub-001',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'processed',
      submissionTime: new Date('2024-01-15'),
      createdAt: new Date('2024-01-15'),
      locationType: 'local',
      city: 'Bucharest',
      country: 'Romania',
      assignments: [
        {
          template: { id: 't1', slug: 'welcome', name: 'Welcome' },
          version: null,
          status: 'completed'
        }
      ]
    }

    vi.mocked(prisma.submission.findMany).mockResolvedValueOnce([mockSubmission] as unknown as Awaited<ReturnType<typeof prisma.submission.findMany>>)
    vi.mocked(prisma.submission.count).mockResolvedValueOnce(1)

    const request = new Request('http://localhost/api/dashboard/submissions/recent')
    const response = await GET(request)
    const data = await response.json()

    expect(data.submissions[0].templates).toEqual([
      { id: 't1', name: 'Welcome', slug: 'welcome', status: 'completed' }
    ])
  })
})
