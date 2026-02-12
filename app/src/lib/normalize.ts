// ABOUTME: Normalizes Fillout submissions into canonical data structures
// ABOUTME: Extracts location, contact, and mapped field values for storage
import type { FilloutSubmission, NormalizedSubmission, FieldValue } from '@/types/fillout'
import type { FieldMapping, FilloutQuestion } from '@prisma/client'

export function detectLocationType(answers: FilloutSubmission['questions']): 'romania' | 'diaspora' | null {
  const locationAnswer = answers.find(a => 
    a.name?.includes('locuiești') || a.name?.includes('Unde locuiești')
  )
  
  if (!locationAnswer?.value) return null
  
  const value = String(locationAnswer.value).toLowerCase()
  
  if (value.includes('românia') || value.includes('romania')) {
    return 'romania'
  } else if (value.includes('în afara româniei') || value.includes('afara')) {
    return 'diaspora'
  }
  
  return null
}

export function extractName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null }
  
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null }
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

export function extractCityAndCountry(
  locationType: 'romania' | 'diaspora' | null,
  answers: FilloutSubmission['questions']
): { city: string | null; country: string | null } {
  if (locationType === 'romania') {
    const cityAnswer = answers.find(a => 
      a.name?.includes('oraș din România')
    )
    return {
      city: cityAnswer?.value ? String(cityAnswer.value) : null,
      country: 'Romania'
    }
  }
  
  if (locationType === 'diaspora') {
    const cityAnswer = answers.find(a => 
      a.name?.includes('oraș și țară')
    )
    if (cityAnswer?.value) {
      const value = String(cityAnswer.value)
      const parts = value.split(/,\s*/)
      return {
        city: parts[0] || null,
        country: parts[1] || null
      }
    }
  }
  
  return { city: null, country: null }
}

export function normalizeSubmission(
  submission: FilloutSubmission
): NormalizedSubmission {
  const locationType = detectLocationType(submission.questions)
  const { city, country } = extractCityAndCountry(locationType, submission.questions)
  
  // Try to find name from various fields
  const nameAnswer = submission.questions.find(a => 
    a.name?.includes('numești') || a.name?.toLowerCase().includes('name')
  )
  const { firstName, lastName } = extractName(nameAnswer?.value ? String(nameAnswer.value) : null)
  
  // Try to find email
  const emailAnswer = submission.questions.find(a => 
    a.name?.toLowerCase().includes('email') || a.type === 'EmailInput'
  )
  
  // Try to find phone
  const phoneAnswer = submission.questions.find(a => 
    a.name?.includes('telefon') || a.type === 'PhoneNumber'
  )
  
  // Try to find church
  const churchAnswer = submission.questions.find(a => 
    a.name?.includes('biserică')
  )
  
  return {
    submissionId: submission.submissionId,
    submissionTime: new Date(submission.submissionTime),
    email: emailAnswer?.value ? String(emailAnswer.value) : null,
    firstName,
    lastName,
    phone: phoneAnswer?.value ? String(phoneAnswer.value) : null,
    locationType,
    city,
    country,
    church: churchAnswer?.value ? String(churchAnswer.value) : null,
    rawData: submission,
    answers: submission.questions.map(q => ({
      questionId: q.id,
      value: q.value ? String(q.value) : null,
      rawValue: q.value
    }))
  }
}

export function mapFieldValues(
  submission: FilloutSubmission,
  mappings: FieldMapping[],
  questions: FilloutQuestion[]
): FieldValue[] {
  const questionMap = new Map(questions.map(q => [q.questionId, q]))
  const answerMap = new Map(submission.questions.map(a => [a.id, a]))
  
  return mappings.map(mapping => {
    const question = questionMap.get(mapping.questionId)
    const answer = question ? answerMap.get(question.id) : undefined
    
    return {
      canonicalKey: mapping.canonicalKey,
      value: answer?.value ? String(answer.value) : null,
      rawValue: answer?.value ?? null
    }
  })
}

export function booleanFromString(value: string | null | undefined): boolean | null {
  if (!value) return null
  const normalized = value.toString().toUpperCase().trim()
  if (normalized === 'TRUE' || normalized === '1' || normalized === 'YES') return true
  if (normalized === 'FALSE' || normalized === '0' || normalized === 'NO') return false
  return null
}
