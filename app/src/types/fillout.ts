export interface FilloutQuestionResponse {
  id: string
  name: string
  type: string
  value: unknown
}

export interface FilloutSubmission {
  submissionId: string
  submissionTime: string
  lastUpdatedAt?: string
  questions: FilloutQuestionResponse[]
  calculations?: unknown[]
  urlParameters?: unknown[]
  scheduling?: unknown[]
  payments?: unknown[]
  quiz?: unknown
  login?: { email: string }
}

export interface FilloutWebhookPayload {
  id: string
  type: 'record.created' | 'record.updated' | 'record.deleted'
  timestamp: string
  data: {
    tableId: string
    recordIds: string[]
    records: Array<{
      id: string
      data: Record<string, unknown>
    }>
    previousRecords?: Array<{
      id: string
      data: Record<string, unknown>
    }>
  }
  metadata: {
    webhookId: number
    organizationId: number
    baseId: string
    attempt: number
    source: string
  }
}

export interface FilloutFormMetadata {
  id: string
  name: string
  questions: Array<{
    id: string
    name: string
    type: string
  }>
}

export interface NormalizedSubmission {
  submissionId: string
  submissionTime: Date
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  locationType: 'romania' | 'diaspora' | null
  city: string | null
  country: string | null
  church: string | null
  rawData: FilloutSubmission
  answers: Array<{
    questionId: string
    value: string | null
    rawValue: unknown
  }>
}

export interface FieldValue {
  canonicalKey: string
  value: string | null
  rawValue: unknown
}
