// ABOUTME: Defines shared types for email editor capabilities and validation warnings
// ABOUTME: Provides strongly typed contracts between editor UI and template screens

export type EditorWarning = {
  code: string
  message: string
  severity: 'info' | 'warning'
}

export type EmailEditorAllowedFeatures = {
  paragraphs?: boolean
  lineBreaks?: boolean
  lists?: boolean
  links?: boolean
  placeholders?: boolean
}
