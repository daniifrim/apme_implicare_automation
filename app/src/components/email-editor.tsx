'use client'

import { useCallback } from 'react'
import {
  BlockNoteEditor,
  PartialBlock
} from '@blocknote/core'
import {
  BlockNoteView,
  useCreateBlockNote
} from '@blocknote/react'
import '@blocknote/core/style.css'
import '@blocknote/mantine/style.css'

interface EmailEditorProps {
  initialContent?: PartialBlock[]
  onChange?: (content: PartialBlock[], html: string, text: string, placeholders: string[]) => void
  editable?: boolean
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^{}]+\}\}/g)
  return matches ? [...new Set(matches.map(m => m.slice(2, -2)))] : []
}

export function EmailEditor({
  initialContent,
  onChange,
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

  const handleChange = useCallback(async () => {
    if (!onChange) return
    
    const blocks = editor.document
    const html = await editor.blocksToHTMLLossy(blocks)
    
    const text = blocks
      .map((block: { content?: Array<{ text?: string }> }) => {
        const content = block.content
          ?.map((c: { text?: string }) => c.text || '')
          .join('') || ''
        return content
      })
      .join('\n')
    
    const placeholders = extractPlaceholders(text)
    
    onChange(blocks as PartialBlock[], html, text, placeholders)
  }, [editor, onChange])

  return (
    <div className="email-editor border rounded-lg overflow-hidden bg-white min-h-[300px]">
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme="light"
      />
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
      text: `{{${placeholder}}}`,
      styles: { bold: true, backgroundColor: '#dbeafe', textColor: '#1e40af' }
    }
  ])
}
