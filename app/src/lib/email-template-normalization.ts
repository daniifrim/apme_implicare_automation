// ABOUTME: Normalizes email HTML into a constrained, deterministic subset for preview and storage
// ABOUTME: Provides plain-text conversion, placeholder extraction, and validation warnings

const PLACEHOLDER_REGEX = /\{\{[^{}]+\}\}/g
const ALLOWED_TAGS = new Set(['p', 'br', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i'])

export type NormalizedEmailContent = {
  html: string
  text: string
  warnings: string[]
}

export function extractPlaceholders(content: string): string[] {
  const matches = content.match(PLACEHOLDER_REGEX)
  return matches ? [...new Set(matches.map((m) => m.slice(2, -2).trim()).filter(Boolean))] : []
}

function decodeEntities(content: string): string {
  return content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function sanitizeHref(rawHref: string): string | null {
  const href = rawHref.trim()
  if (!href) return null

  const allowed = ['http://', 'https://', 'mailto:', 'tel:']
  const lower = href.toLowerCase()

  if (!allowed.some((prefix) => lower.startsWith(prefix))) {
    return null
  }

  return href
}

function normalizeAnchors(inputHtml: string, warnings: string[]): string {
  return inputHtml.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    const hrefMatch = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? ''
    const sanitizedHref = sanitizeHref(href)

    if (!sanitizedHref) {
      warnings.push('Removed an unsupported link URL. Allowed protocols: http, https, mailto, tel.')
      return '<a>'
    }

    return `<a href="${sanitizedHref.replace(/"/g, '&quot;')}">`
  })
}

export function htmlToEmailText(htmlContent: string): string {
  return decodeEntities(
    htmlContent
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p>/gi, '')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<\/?(?:ul|ol)>/gi, '')
      .replace(/<\/?a[^>]*>/gi, '')
      .replace(/<\/?(?:strong|em|b|i)>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

export function normalizeEmailHtml(inputHtml: string): NormalizedEmailContent {
  const warnings: string[] = []

  let html = (inputHtml || '').replace(/\r\n/g, '\n')

  if (/(class=|style=|font-family|mso-|data-)/i.test(html)) {
    warnings.push('Removed unsupported rich formatting attributes from pasted content.')
  }

  html = html.replace(/<!--[\s\S]*?-->/g, '')
  html = html.replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')

  html = html
    .replace(/<\/?(?:div|section|article|header|footer|main|aside|h[1-6]|blockquote|pre)\b[^>]*>/gi, () => {
      warnings.push('Removed unsupported block wrapper elements.')
      return ''
    })
    .replace(/<\/?(?:table|thead|tbody|tr|td|th|span)\b[^>]*>/gi, () => {
      warnings.push('Removed unsupported table/span markup for email compatibility.')
      return ''
    })

  html = normalizeAnchors(html, warnings)

  html = html
    .replace(/<p\b[^>]*>/gi, '<p>')
    .replace(/<ul\b[^>]*>/gi, '<ul>')
    .replace(/<ol\b[^>]*>/gi, '<ol>')
    .replace(/<li\b[^>]*>/gi, '<li>')
    .replace(/<strong\b[^>]*>/gi, '<strong>')
    .replace(/<em\b[^>]*>/gi, '<em>')
    .replace(/<b\b[^>]*>/gi, '<b>')
    .replace(/<i\b[^>]*>/gi, '<i>')
    .replace(/<br\b[^>]*\/?\s*>/gi, '<br />')

  html = html.replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, (full, tag: string) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) {
      return full
    }

    warnings.push(`Removed unsupported tag <${tag.toLowerCase()}>.`)
    return ''
  })

  html = html
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/(<br\s*\/>\s*){3,}/gi, '<br /><br />')
    .trim()

  const text = htmlToEmailText(html)

  return {
    html,
    text,
    warnings: [...new Set(warnings)]
  }
}

export function collectTemplatePlaceholders(fields: Array<string | null | undefined>): string[] {
  return [...new Set(fields.flatMap((field) => extractPlaceholders(field ?? '')))]
}
