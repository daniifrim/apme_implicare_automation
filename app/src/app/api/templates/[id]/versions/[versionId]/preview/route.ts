import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const body = await request.json()
    const { submissionId } = body
    
    const [version, submission] = await Promise.all([
      prisma.templateVersion.findUnique({
        where: { id: params.versionId }
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
    
    if (submission) {
      const data = submission.data as Record<string, string>
      
      for (const placeholder of version.placeholders) {
        const value = data[placeholder] || ''
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g')
        htmlContent = htmlContent.replace(regex, value)
        textContent = textContent.replace(regex, value)
      }
      
      htmlContent = htmlContent.replace(/\{\{[^{}]+\}\}/g, '')
      textContent = textContent.replace(/\{\{[^{}]+\}\}/g, '')
    }
    
    return NextResponse.json({
      preview: {
        html: htmlContent,
        text: textContent,
        subject: version.subject,
        preheader: version.preheader,
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
