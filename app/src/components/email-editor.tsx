'use client'

import { useCallback, useEffect } from 'react'
import {
  BlockNoteEditor,
  PartialBlock
} from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

interface EmailEditorProps {
  initialContent?: PartialBlock[]
  onChange?: (content: PartialBlock[], html: string, text: string, placeholders: string[]) => void
  onEditorReady?: (editor: BlockNoteEditor) => void
  editable?: boolean
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^{}]+\}\}/g)
  return matches ? [...new Set(matches.map(m => m.slice(2, -2)))] : []
}

export function EmailEditor({
  initialContent,
  onChange,
  onEditorReady,
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
    const html = await editor.blocksToHTMLLossy(blocks)

    const text = html
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    
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
