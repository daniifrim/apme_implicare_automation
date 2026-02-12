import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function generateUniqueSlug(baseSlug: string, attempt: number): string {
  if (attempt === 0) return `${baseSlug}-copy`
  return `${baseSlug}-copy-${attempt}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Fetch the template with all versions
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const latestVersion = template.versions[0]
    
    // Generate unique slug
    let newSlug = ''
    let attempt = 0
    let existingTemplate = null
    
    do {
      newSlug = generateUniqueSlug(template.slug, attempt)
      existingTemplate = await prisma.template.findUnique({
        where: { slug: newSlug }
      })
      attempt++
    } while (existingTemplate)

    // Create new template with copied data
    const newTemplate = await prisma.template.create({
      data: {
        slug: newSlug,
        name: `${template.name} (Copy)`,
        description: template.description,
        status: 'draft',
        tags: [...template.tags],
        versions: latestVersion
          ? {
              create: {
                versionNumber: 1,
                name: 'Initial Version',
                subject: latestVersion.subject,
                preheader: latestVersion.preheader,
                editorState: latestVersion.editorState as Prisma.InputJsonValue,
                htmlContent: latestVersion.htmlContent,
                textContent: latestVersion.textContent,
                placeholders: latestVersion.placeholders,
                isPublished: false
              }
            }
          : undefined
      },
      include: {
        versions: true
      }
    })

    return NextResponse.json({ 
      template: newTemplate,
      message: 'Template duplicated successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error duplicating template:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate template' },
      { status: 500 }
    )
  }
}
