import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function resolvePlaceholderValue(
  submission: {
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    city: string | null
    country: string | null
    church: string | null
    rawData: unknown
  },
  placeholder: string
): string {
  const raw = (submission.rawData ?? {}) as Record<string, unknown>

  switch (placeholder) {
    case 'FirstName':
      return submission.firstName ?? ''
    case 'LastName':
      return submission.lastName ?? ''
    case 'Email':
      return submission.email ?? ''
    case 'Phone':
      return submission.phone ?? ''
    case 'City':
      return submission.city ?? ''
    case 'Country':
      return submission.country ?? ''
    case 'Church':
      return submission.church ?? ''
    case 'Missionary': {
      const v = raw['Pentru ce misionar vrei să te rogi?']
      return typeof v === 'string' ? v : ''
    }
    case 'EthnicGroup': {
      const v = raw['Pentru care popor neatins vrei să te rogi?']
      return typeof v === 'string' ? v : ''
    }
    default: {
      const v = raw[placeholder]
      if (typeof v === 'string') return v
      return ''
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params
    const body = await request.json()
    const { submissionId } = body
    
    const [version, submission] = await Promise.all([
      prisma.templateVersion.findUnique({
        where: { id: versionId }
      }),
      submissionId ? prisma.submission.findUnique({
        where: { id: submissionId }
      }) : null
    ])
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }
    
    let htmlContent = version.htmlContent
    let textContent = version.textContent || ''
    let subject = version.subject
    let preheader = version.preheader || ''
    
    if (submission) {
      for (const placeholder of version.placeholders) {
        const value = resolvePlaceholderValue(submission, placeholder)
        const token = `{{${placeholder}}}`

        htmlContent = htmlContent.split(token).join(value)
        textContent = textContent.split(token).join(value)
        subject = subject.split(token).join(value)
        preheader = preheader.split(token).join(value)
      }

      htmlContent = htmlContent.replace(/\{\{[^{}]+\}\}/g, '')
      textContent = textContent.replace(/\{\{[^{}]+\}\}/g, '')
      subject = subject.replace(/\{\{[^{}]+\}\}/g, '')
      preheader = preheader.replace(/\{\{[^{}]+\}\}/g, '')
    }
    
    return NextResponse.json({
      preview: {
        html: htmlContent,
        text: textContent,
        subject,
        preheader,
        placeholders: version.placeholders,
        submission: submission ? {
          id: submission.id,
          firstName: submission.firstName,
          lastName: submission.lastName,
          email: submission.email
        } : null
      }
    })
  } catch (error) {
    console.error('Error generating preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
