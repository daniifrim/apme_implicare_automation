import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import type { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params
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
      where: { id: versionId },
      include: { template: true }
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

    const oldValue = {
      name: version.name,
      subject: version.subject,
      preheader: version.preheader,
      placeholders: version.placeholders
    }
    
    const updatedVersion = await prisma.templateVersion.update({
      where: { id: versionId },
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

    const newValue = {
      name: updatedVersion.name,
      subject: updatedVersion.subject,
      preheader: updatedVersion.preheader,
      placeholders: updatedVersion.placeholders
    }

    await createAuditLog({
      userId: 'system',
      action: 'updated',
      resource: 'template_version',
      resourceId: versionId,
      oldValue,
      newValue: {
        ...newValue,
        templateName: version.template.name,
        versionNumber: version.versionNumber
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
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { versionId } = await params
    const version = await prisma.templateVersion.findUnique({
      where: { id: versionId },
      include: { template: true }
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

    const oldValue = {
      name: version.name,
      subject: version.subject,
      versionNumber: version.versionNumber,
      templateName: version.template.name
    }
    
    await prisma.templateVersion.delete({
      where: { id: versionId }
    })

    await createAuditLog({
      userId: 'system',
      action: 'deleted',
      resource: 'template_version',
      resourceId: versionId,
      oldValue,
      newValue: null
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
