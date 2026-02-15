import { prisma } from '@/lib/prisma'
import { assignmentEngine, type NormalizedSubmission as EngineNormalizedSubmission } from '@/lib/assignment-engine'
import type { NormalizedSubmission } from '@/types/fillout'

interface Template {
  id: string
  slug: string
  [key: string]: unknown
}

export interface AssignmentCreationResult {
  created: number
  skipped: number
  errors: string[]
}

/**
 * Converts normalized submission answers array to the Record format expected by assignment engine
 */
function convertAnswersToRecord(answers: NormalizedSubmission['answers']): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  
  for (const answer of answers) {
    // Use questionId as the key, or try to normalize the question name
    const key = answer.questionId.toLowerCase().replace(/\s+/g, '_')
    record[key] = answer.rawValue
    
    // Also add with common field mappings
    if (key.includes('volunteer') || key.includes('voluntariat')) {
      record['mission_interests'] = record['mission_interests'] || []
      if (Array.isArray(record['mission_interests'])) {
        record['mission_interests'] = [...record['mission_interests'], 'volunteer']
      }
    }
    if (key.includes('kairos')) {
      record['course_interests'] = record['course_interests'] || []
      if (Array.isArray(record['course_interests'])) {
        record['course_interests'] = [...record['course_interests'], 'kairos']
      }
    }
  }
  
  return record
}

/**
 * Creates template assignments for a submission based on the assignment engine rules
 * 
 * ABOUTME: This function runs the assignment engine on a submission and persists
 * the results as Assignment records in the database. It handles idempotency by
 * checking for existing assignments before creating new ones.
 */
export async function createAssignmentsForSubmission(
  submissionId: string,
  normalizedSubmission: NormalizedSubmission
): Promise<AssignmentCreationResult> {
  const result: AssignmentCreationResult = {
    created: 0,
    skipped: 0,
    errors: []
  }

  try {
    // Convert to the format expected by assignment engine
    const engineSubmission: EngineNormalizedSubmission = {
      id: submissionId,
      email: normalizedSubmission.email,
      firstName: normalizedSubmission.firstName,
      lastName: normalizedSubmission.lastName,
      locationType: normalizedSubmission.locationType,
      city: normalizedSubmission.city,
      country: normalizedSubmission.country,
      church: normalizedSubmission.church,
      answers: convertAnswersToRecord(normalizedSubmission.answers)
    }

    // Run the assignment engine
    const assignments = assignmentEngine.assignTemplates(engineSubmission)

    // Also get location-specific templates
    const locationTemplates = assignmentEngine.getLocationSpecificTemplates(
      normalizedSubmission.locationType
    )

    // Combine all template slugs
    const allTemplateSlugs = [
      ...assignments.map(a => a.templateSlug),
      ...locationTemplates
    ]

    // Get template records from database
    const templates = await prisma.template.findMany({
      where: {
        slug: {
          in: allTemplateSlugs
        }
      }
    })

    const templateMap = new Map<string, Template>(templates.map((t: { slug: string; [key: string]: unknown }) => [t.slug, t as Template]))

    // Process rule-based assignments
    for (const assignment of assignments) {
      try {
        const template = templateMap.get(assignment.templateSlug)
        
        if (!template) {
          result.errors.push(`Template not found: ${assignment.templateSlug}`)
          continue
        }

        // Check if assignment already exists (idempotency)
        const existingAssignment = await prisma.assignment.findUnique({
          where: {
            submissionId_templateId: {
              submissionId,
              templateId: template.id
            }
          }
        })

        if (existingAssignment) {
          result.skipped++
          continue
        }

        // Create the assignment
        await prisma.assignment.create({
          data: {
            submissionId,
            templateId: template.id,
            status: 'pending',
            reasonCodes: [assignment.reason]
          }
        })

        result.created++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to create assignment for ${assignment.templateSlug}: ${errorMessage}`)
      }
    }

    // Process location-specific assignments
    for (const templateSlug of locationTemplates) {
      try {
        const template = templateMap.get(templateSlug)
        
        if (!template) {
          result.errors.push(`Template not found: ${templateSlug}`)
          continue
        }

        // Check if assignment already exists
        const existingAssignment = await prisma.assignment.findUnique({
          where: {
            submissionId_templateId: {
              submissionId,
              templateId: template.id
            }
          }
        })

        if (existingAssignment) {
          result.skipped++
          continue
        }

        // Create the assignment
        await prisma.assignment.create({
          data: {
            submissionId,
            templateId: template.id,
            status: 'pending',
            reasonCodes: [`Location-specific: ${normalizedSubmission.locationType}`]
          }
        })

        result.created++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to create assignment for ${templateSlug}: ${errorMessage}`)
      }
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Assignment engine failed: ${errorMessage}`)
    return result
  }
}

/**
 * Updates submission status to 'processed' after successful assignment creation
 */
export async function markSubmissionAsProcessed(submissionId: string): Promise<void> {
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: 'processed',
      processedAt: new Date()
    }
  })
}

/**
 * Re-processes assignments for an existing submission
 * Useful for updating assignments when rules change
 */
export async function reprocessAssignments(submissionId: string): Promise<AssignmentCreationResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      answers: {
        include: {
          question: true
        }
      }
    }
  })

  if (!submission) {
    return {
      created: 0,
      skipped: 0,
      errors: [`Submission not found: ${submissionId}`]
    }
  }

  // Build NormalizedSubmission from database data
  const normalizedSubmission: NormalizedSubmission = {
    submissionId: submission.submissionId,
    submissionTime: submission.submissionTime,
    email: submission.email,
    firstName: submission.firstName,
    lastName: submission.lastName,
    phone: submission.phone,
    locationType: submission.locationType as 'romania' | 'diaspora' | null,
    city: submission.city,
    country: submission.country,
    church: submission.church,
    rawData: submission.rawData as never,
    answers: submission.answers.map((a: { questionId: string; value: string | null; rawValue: unknown }) => ({
      questionId: a.questionId,
      value: a.value,
      rawValue: a.rawValue
    }))
  }
  
  return createAssignmentsForSubmission(submissionId, normalizedSubmission)
}
