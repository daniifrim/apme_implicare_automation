'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Minus, LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
  loading?: boolean
}

const variantStyles = {
  default: 'bg-gray-50 text-gray-600',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-600'
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
  loading = false
}: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0
  const isNeutral = trend !== undefined && trend === 0

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-medium',
                    isPositive && 'text-green-600',
                    isNegative && 'text-red-600',
                    isNeutral && 'text-gray-500'
                  )}
                >
                  {isPositive && <ArrowUp data-testid="trend-up" className="mr-0.5 h-3 w-3" />}
                  {isNegative && <ArrowDown data-testid="trend-down" className="mr-0.5 h-3 w-3" />}
                  {isNeutral && <Minus data-testid="trend-neutral" className="mr-0.5 h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-gray-500">{trendLabel}</span>
                )}
              </div>
            )}
            {description && !trend && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              variantStyles[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
