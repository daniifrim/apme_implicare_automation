import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (fromDate || toDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (fromDate) {
        dateFilter.gte = new Date(fromDate)
      }
      if (toDate) {
        const endDate = new Date(toDate)
        endDate.setHours(23, 59, 59, 999)
        dateFilter.lte = endDate
      }
      where.createdAt = dateFilter
    }

    const skip = (page - 1) * limit

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.webhookEvent.count({ where })
    ])

    // Calculate metrics
    const [allEvents, completedEvents] = await Promise.all([
      prisma.webhookEvent.findMany({
        where: fromDate || toDate ? { createdAt: where.createdAt } : {},
        select: { status: true, createdAt: true, processedAt: true }
      }),
      prisma.webhookEvent.findMany({
        where: {
          status: 'completed',
          ...(fromDate || toDate ? { createdAt: where.createdAt } : {})
        },
        select: { createdAt: true, processedAt: true }
      })
    ])

    const totalEvents = allEvents.length
    const successCount = completedEvents.length
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0

    // Calculate average latency (ms)
    let avgLatency = 0
    if (completedEvents.length > 0) {
      const totalLatency = completedEvents.reduce((sum, event) => {
        if (event.processedAt && event.createdAt) {
          return sum + (event.processedAt.getTime() - event.createdAt.getTime())
        }
        return sum
      }, 0)
      avgLatency = Math.round(totalLatency / completedEvents.length)
    }

    return NextResponse.json({
      events,
      metrics: {
        total: totalEvents,
        successRate: Math.round(successRate * 10) / 10,
        avgLatency
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching webhook events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook events' },
      { status: 500 }
    )
  }
}
