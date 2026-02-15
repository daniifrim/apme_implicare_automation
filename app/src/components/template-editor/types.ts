import type { PartialBlock } from '@blocknote/core'

export interface Template {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  versionNumber: number
  name: string
  subject: string
  preheader: string | null
  editorState: PartialBlock[]
  htmlContent: string
  textContent: string | null
  placeholders: string[]
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}

export interface Submission {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface PreviewData {
  html: string
  text: string
  subject: string
  warnings: string[]
  submission: Submission | null
}
