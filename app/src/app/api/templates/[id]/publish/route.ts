import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const versionId = searchParams.get('versionId')

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId is required' },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        versions: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const version = template.versions.find((v: { id: string }) => v.id === versionId)

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    const previousPublishedVersion = template.versions.find((v: { isPublished: boolean }) => v.isPublished)

    await prisma.$transaction([
      prisma.templateVersion.updateMany({
        where: { templateId: id },
        data: { isPublished: false }
      }),
      prisma.templateVersion.update({
        where: { id: versionId },
        data: {
          isPublished: true,
          publishedAt: new Date()
        }
      }),
      prisma.template.update({
        where: { id },
        data: { status: 'active' }
      })
    ])

    await createAuditLog({
      userId: 'system',
      action: 'published',
      resource: 'template',
      resourceId: id,
      oldValue: previousPublishedVersion ? {
        versionId: previousPublishedVersion.id,
        versionNumber: previousPublishedVersion.versionNumber
      } : null,
      newValue: {
        versionId: versionId,
        versionNumber: version.versionNumber,
        templateName: template.name
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error publishing template version:', error)
    return NextResponse.json(
      { error: 'Failed to publish template version' },
      { status: 500 }
    )
  }
}
