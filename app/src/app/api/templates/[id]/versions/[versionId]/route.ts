import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
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
    
    const version = await prisma.templateVersion.findUnique({
      where: { id: params.versionId }
    })
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }
    
    if (version.isPublished) {
      return NextResponse.json(
        { error: 'Cannot edit published version. Create a new version instead.' },
        { status: 400 }
      )
    }
    
    const updatedVersion = await prisma.templateVersion.update({
      where: { id: params.versionId },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(preheader !== undefined && { preheader }),
        ...(editorState !== undefined && { editorState: editorState as Prisma.InputJsonValue }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(placeholders !== undefined && { placeholders })
      }
    })
    
    return NextResponse.json({ version: updatedVersion })
  } catch (error) {
    console.error('Error updating version:', error)
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const version = await prisma.templateVersion.findUnique({
      where: { id: params.versionId }
    })
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }
    
    if (version.isPublished) {
      return NextResponse.json(
        { error: 'Cannot delete published version' },
        { status: 400 }
      )
    }
    
    await prisma.templateVersion.delete({
      where: { id: params.versionId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting version:', error)
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    )
  }
}
