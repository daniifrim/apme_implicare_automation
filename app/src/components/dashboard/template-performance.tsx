'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Mail, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TemplatePerformance {
  id: string
  slug: string
  name: string
  _count: { assignments: number }
}

interface TemplatePerformanceProps {
  templates: TemplatePerformance[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
}

export function TemplatePerformanceWidget({
  templates,
  title = 'Template Performance',
  description = 'Top templates by assignment count',
  className,
  loading = false
}: TemplatePerformanceProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          {description && <Skeleton className="h-4 w-56" />}
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...templates.map(t => t._count.assignments), 1)
  const totalAssignments = templates.reduce((sum, t) => sum + t._count.assignments, 0)

  // Sort by assignment count (descending)
  const sortedTemplates = [...templates].sort((a, b) => 
    b._count.assignments - a._count.assignments
  )

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">{totalAssignments}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No templates yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Templates will appear here once created
            </p>
          </div>
        ) : (
          sortedTemplates.map((template, index) => {
            const percentage = (template._count.assignments / maxCount) * 100
            const usageRate = totalAssignments > 0 
              ? Math.round((template._count.assignments / totalAssignments) * 100) 
              : 0

            return (
              <div key={template.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900">
                      {template.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {template._count.assignments} assignments
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress 
                    value={percentage} 
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {usageRate}%
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
