import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            template: true,
            version: true
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(submission)

  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'firstName',
      'lastName', 
      'email',
      'phone',
      'locationType',
      'city',
      'country',
      'church',
      'status'
    ]

    const updateData: Record<string, unknown> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Map camelCase to database snake_case
        const dbField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        updateData[dbField] = body[field] || null
      }
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: {
            template: true,
            version: true
          }
        },
        answers: {
          include: { question: true }
        }
      }
    })

    return NextResponse.json(submission)

  } catch (error) {
    console.error('Error updating submission:', error)
    
    if (error instanceof Error && error.message.includes('Record not found')) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}
