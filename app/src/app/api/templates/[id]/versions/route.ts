import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const versions = await prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { versionNumber: 'desc' }
    })
    
    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      subject,
      preheader,
      editorState,
      htmlContent,
      textContent,
      placeholders
    } = body

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

    const nextVersionNumber = template.versions[0]?.versionNumber + 1 || 1

    const version = await prisma.templateVersion.create({
      data: {
        templateId: id,
        versionNumber: nextVersionNumber,
        name,
        subject,
        preheader,
        editorState: editorState as Prisma.InputJsonValue,
        htmlContent,
        textContent,
        placeholders: placeholders || []
      }
    })

    return NextResponse.json({ version }, { status: 201 })

  } catch (error) {
    console.error('Error creating template version:', error)
    return NextResponse.json(
      { error: 'Failed to create template version' },
      { status: 500 }
    )
  }
}
