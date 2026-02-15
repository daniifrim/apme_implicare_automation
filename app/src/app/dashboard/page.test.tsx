import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import DashboardPage from './page'

// Mock fetch
global.fetch = vi.fn()

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('DashboardPage', () => {
  const mockStats = {
    stats: {
      submissions: {
        total: 100,
        pending: 10,
        processed: 85,
        failed: 5,
        processingRate: 85,
        pendingRate: 10,
        trend: 15,
        yesterdayCount: 20
      },
      templates: {
        total: 25,
        active: 20
      },
      assignments: {
        total: 150,
        pending: 30,
        completed: 100
      }
    },
    trends: {
      submissions: [
        { date: '2024-01-09', count: 10 },
        { date: '2024-01-10', count: 15 },
        { date: '2024-01-11', count: 8 },
        { date: '2024-01-12', count: 20 },
        { date: '2024-01-13', count: 12 },
        { date: '2024-01-14', count: 18 },
        { date: '2024-01-15', count: 25 }
      ]
    },
    templatePerformance: [
      { id: '1', slug: 'welcome', name: 'Welcome Email', _count: { assignments: 50 } },
      { id: '2', slug: 'followup', name: 'Follow Up', _count: { assignments: 30 } }
    ]
  }

  const mockSubmissions = {
    submissions: [
      {
        id: '1',
        submissionId: 'sub-001',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'pending',
        submissionTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        locationType: 'local',
        assignmentCount: 2,
        templates: [
          { id: '1', name: 'Welcome', slug: 'welcome', status: 'pending' }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1,
      hasMore: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats)
    } as Response)
  })

  it('renders dashboard with loading state initially', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Overview of your email automation system')).toBeInTheDocument()
    // Should show loading skeletons
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders dashboard stats after loading', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSubmissions) } as Response)

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    // Check for card titles
    const cardTitles = screen.getAllByText('Total Submissions')
    expect(cardTitles.length).toBeGreaterThan(0)
    expect(screen.getByText('Active Templates')).toBeInTheDocument()
  })

  it('handles fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })
})
