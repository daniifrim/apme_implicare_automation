import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TrendData {
  date: string
  count: number
}

interface TemplateUsage {
  id: string
  slug: string
  name: string
  _count: { assignments: number }
}

export async function GET(request: NextRequest) {
  try {
    // Get date range for 7-day trend (including today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    // Fetch all stats in parallel
    const [
      totalSubmissions,
      pendingSubmissions,
      processedSubmissions,
      failedSubmissions,
      totalTemplates,
      activeTemplates,
      totalAssignments,
      pendingAssignments,
      completedAssignments,
      recentSubmissionsTrend,
      templateUsage
    ] = await Promise.all([
      // Basic counts
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'pending' } }),
      prisma.submission.count({ where: { status: 'processed' } }),
      prisma.submission.count({ where: { status: 'failed' } }),
      
      // Template counts
      prisma.template.count(),
      prisma.template.count({ where: { status: 'active' } }),
      
      // Assignment counts
      prisma.assignment.count(),
      prisma.assignment.count({ where: { status: 'pending' } }),
      prisma.assignment.count({ where: { status: 'completed' } }),
      
      // 7-day trend data
      getDailySubmissionsTrend(sevenDaysAgo, today),
      
      // Template usage stats
      getTemplateUsage()
    ])

    // Calculate percentages/trends
    const processingRate = totalSubmissions > 0 
      ? Math.round((processedSubmissions / totalSubmissions) * 100) 
      : 0
    
    const pendingRate = totalSubmissions > 0 
      ? Math.round((pendingSubmissions / totalSubmissions) * 100) 
      : 0

    // Calculate day-over-day change for total submissions
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(yesterday)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1)

    const [yesterdayCount, dayBeforeCount] = await Promise.all([
      prisma.submission.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      }),
      prisma.submission.count({
        where: {
          createdAt: {
            gte: twoDaysAgo,
            lt: yesterday
          }
        }
      })
    ])

    const submissionTrend = dayBeforeCount > 0 
      ? Math.round(((yesterdayCount - dayBeforeCount) / dayBeforeCount) * 100)
      : yesterdayCount > 0 ? 100 : 0

    return NextResponse.json({
      stats: {
        submissions: {
          total: totalSubmissions,
          pending: pendingSubmissions,
          processed: processedSubmissions,
          failed: failedSubmissions,
          processingRate,
          pendingRate,
          trend: submissionTrend,
          yesterdayCount
        },
        templates: {
          total: totalTemplates,
          active: activeTemplates
        },
        assignments: {
          total: totalAssignments,
          pending: pendingAssignments,
          completed: completedAssignments
        }
      },
      trends: {
        submissions: recentSubmissionsTrend
      },
      templatePerformance: templateUsage
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

async function getDailySubmissionsTrend(from: Date, to: Date): Promise<TrendData[]> {
  // Generate array of last 7 days
  const days: TrendData[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(to)
    date.setDate(date.getDate() - (6 - i))
    days.push({
      date: date.toISOString().split('T')[0],
      count: 0
    })
  }

  // Get counts for each day
  const submissions = await prisma.submission.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    },
    select: {
      createdAt: true
    }
  })

  // Aggregate by date
  const counts = submissions.reduce((acc: Record<string, number>, sub: { createdAt: Date }) => {
    const date = sub.createdAt.toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Merge with days array
  return days.map(day => ({
    ...day,
    count: counts[day.date] || 0
  }))
}

async function getTemplateUsage(): Promise<TemplateUsage[]> {
  return prisma.template.findMany({
    where: {
      status: 'active'
    },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: {
        select: { assignments: true }
      }
    },
    orderBy: {
      assignments: {
        _count: 'desc'
      }
    },
    take: 5
  })
}
