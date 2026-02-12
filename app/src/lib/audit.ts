import { prisma } from '@/lib/prisma'

export interface AuditLogData {
  userId: string
  action: string
  resource: string
  resourceId?: string
  oldValue?: unknown
  newValue?: unknown
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  return null
}
