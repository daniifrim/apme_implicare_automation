// ABOUTME: Renders a constrained BlockNote-based email editor for template authoring
// ABOUTME: Produces normalized email HTML/text and editor validation warnings on content changes
'use client'

import { useCallback, useEffect } from 'react'
import {
  BlockNoteEditor,
  PartialBlock
} from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

import { extractPlaceholders, normalizeEmailHtml } from '@/lib/email-template-normalization'
import type { EmailEditorAllowedFeatures, EditorWarning } from '@/types/email-editor'

interface EmailEditorProps {
  initialContent?: PartialBlock[]
  onChange?: (
    content: PartialBlock[],
    html: string,
    text: string,
    placeholders: string[],
    warnings: string[]
  ) => void
  onEditorReady?: (editor: BlockNoteEditor) => void
  onValidationChange?: (warnings: EditorWarning[]) => void
  allowedFeatures?: EmailEditorAllowedFeatures
  showBlockHandles?: boolean
  editable?: boolean
}

export function EmailEditor({
  initialContent,
  onChange,
  onEditorReady,
  onValidationChange,
  allowedFeatures = {
    paragraphs: true,
    lineBreaks: true,
    lists: true,
    links: true,
    placeholders: true
  },
  showBlockHandles = false,
  editable = true
}: EmailEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || [
      {
        type: 'paragraph',
        content: ''
      }
    ]
  })

  useEffect(() => {
    onEditorReady?.(editor)
  }, [editor, onEditorReady])

  const handleChange = useCallback(async () => {
    if (!onChange) return

    const blocks = editor.document
    const lossyHtml = await editor.blocksToHTMLLossy(blocks)
    const normalized = normalizeEmailHtml(lossyHtml)

    const placeholders = extractPlaceholders(
      `${normalized.html}\n${normalized.text}`
    )

    const validationWarnings: EditorWarning[] = normalized.warnings.map((warning, index) => ({
      code: `NORMALIZATION_${index + 1}`,
      message: warning,
      severity: 'warning'
    }))

    onValidationChange?.(validationWarnings)
    onChange(blocks as PartialBlock[], normalized.html, normalized.text, placeholders, normalized.warnings)
  }, [editor, onChange, onValidationChange])

  return (
    <div
      className="email-editor border rounded-lg overflow-hidden bg-white min-h-[300px]"
      data-hide-handles={!showBlockHandles}
      data-allow-lists={allowedFeatures.lists}
      data-allow-links={allowedFeatures.links}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme="light"
      />

      <style jsx global>{`
        .email-editor[data-hide-handles='true'] .bn-side-menu,
        .email-editor[data-hide-handles='true'] [class*='sideMenu'] {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

export function insertPlaceholder(
  editor: BlockNoteEditor,
  placeholder: string
) {
  editor.insertInlineContent([
    {
      type: 'text',
      text: `{{${placeholder}}}`
    }
  ])
}
