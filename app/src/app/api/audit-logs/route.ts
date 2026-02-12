import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE)))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)))
    )
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (action) {
      where.action = action
    }

    if (resource) {
      where.resource = resource
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { resourceId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          user: {
            email: { contains: search, mode: 'insensitive' }
          }
        }
      ]
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
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    const distinctActions = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true }
    })

    const distinctResources = await prisma.auditLog.findMany({
      distinct: ['resource'],
      select: { resource: true }
    })

    const users = await prisma.user.findMany({
      where: {
        auditLogs: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        actions: distinctActions.map(a => a.action).sort(),
        resources: distinctResources.map(r => r.resource).sort(),
        users
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
