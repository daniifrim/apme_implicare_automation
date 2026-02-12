import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const templatesDir = path.join(process.cwd(), '..', '..', 'docs', 'email-templates')

interface TemplateFile {
  filename: string
  slug: string
  name: string
  content: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

function parseFilename(filename: string): { slug: string; name: string } {
  const nameWithoutExt = filename.replace('.txt', '')
  return {
    slug: slugify(nameWithoutExt),
    name: nameWithoutExt
  }
}

function extractPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{[^{}]+\}\}/g)
  return matches ? [...new Set(matches.map(m => m.slice(2, -2)))] : []
}

function convertToBlockNote(content: string) {
  const paragraphs = content.split('\n').filter(line => line.trim())
  
  const blocks = paragraphs.map(line => {
    if (line.match(/^\s*•\s/)) {
      return {
        type: "bulletListItem",
        content: [{
          type: "text",
          text: line.replace(/^\s*•\s/, '')
        }]
      }
    }
    
    if (line.match(/^\s*\d+\.\s/)) {
      return {
        type: "numberedListItem",
        content: [{
          type: "text",
          text: line.replace(/^\s*\d+\.\s/, '')
        }]
      }
    }
    
    const segments: Array<{ type: 'text'; text: string; marks?: Array<{ type: 'placeholder' }> }> = []
    let lastIndex = 0
    const placeholderRegex = /\{\{[^{}]+\}\}/g
    let match
    
    while ((match = placeholderRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          text: line.slice(lastIndex, match.index)
        })
      }
      
      segments.push({
        type: 'text',
        text: match[0],
        marks: [{ type: 'placeholder' }]
      })
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < line.length) {
      segments.push({
        type: 'text',
        text: line.slice(lastIndex)
      })
    }
    
    return {
      type: "paragraph",
      content: segments.length > 0 ? segments : [{ type: "text", text: "" }]
    }
  })
  
  return blocks
}

export async function POST(request: NextRequest) {
  try {
    const files = fs.readdirSync(templatesDir)
    const txtFiles = files.filter(f => f.endsWith('.txt'))
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    for (const filename of txtFiles) {
      try {
        const { slug, name } = parseFilename(filename)
        const content = fs.readFileSync(path.join(templatesDir, filename), 'utf-8')
        
        const existing = await prisma.template.findUnique({
          where: { slug }
        })
        
        if (existing) {
          results.skipped++
          continue
        }
        
        const placeholders = extractPlaceholders(content)
        const editorState = convertToBlockNote(content)
        
        const htmlContent = content
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            if (line.match(/^\s*•\s/)) {
              return `<li>${line.replace(/^\s*•\s/, '')}</li>`
            }
            if (line.match(/^\s*\d+\.\s/)) {
              return `<li>${line.replace(/^\s*\d+\.\s/, '')}</li>`
            }
            return `<p>${line}</p>`
          })
          .join('')
        
        const template = await prisma.template.create({
          data: {
            slug,
            name,
            description: `Imported from ${filename}`,
            status: 'draft',
            tags: ['imported'],
            versions: {
              create: {
                versionNumber: 1,
                name: 'Initial Version',
                subject: name,
                preheader: '',
                editorState: editorState as any,
                htmlContent,
                textContent: content,
                placeholders,
                isPublished: false
              }
            }
          }
        })
        
        results.imported++
      } catch (error) {
        results.errors.push(`Failed to import ${filename}: ${error}`)
      }
    }
    
    return NextResponse.json({ 
      success: true,
      results,
      message: `Imported ${results.imported} templates, skipped ${results.skipped} existing templates`
    })
    
  } catch (error) {
    console.error('Error importing templates:', error)
    return NextResponse.json(
      { error: 'Failed to import templates' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const files = fs.readdirSync(templatesDir)
    const txtFiles = files.filter(f => f.endsWith('.txt'))
    
    const templates = txtFiles.map(filename => {
      const { slug, name } = parseFilename(filename)
      const content = fs.readFileSync(path.join(templatesDir, filename), 'utf-8')
      
      return {
        filename,
        slug,
        name,
        content,
        placeholders: extractPlaceholders(content)
      }
    })
    
    return NextResponse.json({ templates })
    
  } catch (error) {
    console.error('Error listing templates:', error)
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    )
  }
}
