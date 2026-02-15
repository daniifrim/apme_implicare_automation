import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'
import { FileText, TrendingUp } from 'lucide-react'

describe('StatCard', () => {
  it('renders with required props', () => {
    render(
      <StatCard
        title="Total Submissions"
        value={100}
        icon={FileText}
      />
    )

    expect(screen.getByText('Total Submissions')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders with trend indicator when trend is positive', () => {
    render(
      <StatCard
        title="Submissions"
        value={100}
        icon={FileText}
        trend={15}
        trendLabel="vs last week"
      />
    )

    expect(screen.getByText('15%')).toBeInTheDocument()
    expect(screen.getByText('vs last week')).toBeInTheDocument()
    expect(screen.getByTestId('trend-up')).toBeInTheDocument()
  })

  it('renders with trend indicator when trend is negative', () => {
    render(
      <StatCard
        title="Submissions"
        value={100}
        icon={FileText}
        trend={-10}
      />
    )

    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByTestId('trend-down')).toBeInTheDocument()
  })

  it('renders description when no trend', () => {
    render(
      <StatCard
        title="Submissions"
        value={100}
        icon={FileText}
        description="Updated just now"
      />
    )

    expect(screen.getByText('Updated just now')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(
      <StatCard
        title="Submissions"
        value={100}
        icon={FileText}
        loading={true}
      />
    )

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    const { container } = render(
      <StatCard
        title="Submissions"
        value={100}
        icon={FileText}
        variant="success"
      />
    )

    const iconContainer = container.querySelector('.bg-green-50')
    expect(iconContainer).toBeInTheDocument()
  })
})
