import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fieldMapping: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    filloutQuestion: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn()
}))

describe('GET /api/mappings', () => {
  const mockMappings = [
    {
      id: 'mapping-1',
      canonicalKey: 'FIRST_NAME',
      questionId: 'q1',
      description: 'First name field',
      isRequired: true,
      question: {
        id: 'q1',
        name: 'Cum te numești?',
        form: { id: 'form-1', name: 'Test Form' }
      }
    },
    {
      id: 'mapping-2',
      canonicalKey: 'EMAIL',
      questionId: 'q3',
      description: null,
      isRequired: true,
      question: {
        id: 'q3',
        name: 'Email',
        form: { id: 'form-1', name: 'Test Form' }
      }
    }
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.fieldMapping.findMany).mockResolvedValue(mockMappings as never)
  })

  it('should return all field mappings', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.mappings).toHaveLength(2)
    expect(data.mappings[0].canonicalKey).toBe('FIRST_NAME')
  })

  it('should include question and form details', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.mappings[0].question).toBeDefined()
    expect(data.mappings[0].question.form).toBeDefined()
  })

  it('should sort by canonicalKey', async () => {
    await GET()

    expect(prisma.fieldMapping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { canonicalKey: 'asc' }
      })
    )
  })

  it('should handle database errors', async () => {
    vi.mocked(prisma.fieldMapping.findMany).mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch field mappings')
  })
})

describe('POST /api/mappings', () => {
  const mockQuestion = {
    id: 'q1',
    name: 'Cum te numești?',
    formId: 'form-1'
  }

  const mockMapping = {
    id: 'mapping-1',
    canonicalKey: 'FIRST_NAME',
    questionId: 'q1',
    description: 'First name field',
    isRequired: true,
    question: {
      id: 'q1',
      name: 'Cum te numești?',
      form: { id: 'form-1', name: 'Test Form' }
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.filloutQuestion.findUnique).mockResolvedValue(mockQuestion as never)
  })

  it('should create a new mapping when canonicalKey does not exist', async () => {
    vi.mocked(prisma.fieldMapping.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.fieldMapping.create).mockResolvedValue(mockMapping as never)

    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        canonicalKey: 'FIRST_NAME',
        questionId: 'q1',
        description: 'First name field',
        isRequired: true
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.mapping.canonicalKey).toBe('FIRST_NAME')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'created',
        resource: 'mapping',
        resourceId: 'mapping-1'
      })
    )
  })

  it('should update existing mapping when canonicalKey exists', async () => {
    const existingMapping = {
      id: 'mapping-1',
      canonicalKey: 'FIRST_NAME',
      questionId: 'q2',
      description: 'Old description',
      isRequired: false
    }

    vi.mocked(prisma.fieldMapping.findUnique).mockResolvedValue(existingMapping as never)
    vi.mocked(prisma.fieldMapping.update).mockResolvedValue(mockMapping as never)

    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        canonicalKey: 'FIRST_NAME',
        questionId: 'q1',
        description: 'First name field',
        isRequired: true
      })
    })

    const response = await POST(request)
    await response.json()

    expect(response.status).toBe(200)
    expect(prisma.fieldMapping.update).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updated',
        resource: 'mapping',
        oldValue: expect.objectContaining({
          questionId: 'q2',
          description: 'Old description'
        }),
        newValue: expect.objectContaining({
          questionId: 'q1',
          description: 'First name field'
        })
      })
    )
  })

  it('should return 400 if canonicalKey is missing', async () => {
    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({ questionId: 'q1' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('canonicalKey')
  })

  it('should return 400 if questionId is missing', async () => {
    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({ canonicalKey: 'FIRST_NAME' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('questionId')
  })

  it('should return 404 if question does not exist', async () => {
    vi.mocked(prisma.filloutQuestion.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        canonicalKey: 'FIRST_NAME',
        questionId: 'nonexistent'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Question not found')
  })

  it('should handle database errors', async () => {
    vi.mocked(prisma.fieldMapping.findUnique).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/mappings', {
      method: 'POST',
      body: JSON.stringify({
        canonicalKey: 'FIRST_NAME',
        questionId: 'q1'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create/update field mapping')
  })
})
