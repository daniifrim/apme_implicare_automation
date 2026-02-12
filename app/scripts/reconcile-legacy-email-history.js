#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const { parse } = require('csv-parse/sync')
const { PrismaClient } = require('@prisma/client')

const {
  chunkArray,
  getTemplateLookupKeys,
  normalizeTemplateName,
  parseLegacySentDate
} = require('./legacy-email-history-utils')

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    csvPath: null,
    limit: null
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]

    if (a === '--apply') {
      args.apply = true
      args.dryRun = false
      continue
    }

    if (a === '--dry-run') {
      args.apply = false
      args.dryRun = true
      continue
    }

    if (a === '--csv') {
      args.csvPath = argv[i + 1] || null
      i++
      continue
    }

    if (a === '--limit') {
      const raw = argv[i + 1]
      i++
      if (!raw) continue
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n) && n > 0) args.limit = n
      continue
    }
  }

  return args
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const idx = trimmed.indexOf('=')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()

    if (!key) continue

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function ensureEnvLoaded(appDir) {
  // Prisma client does not auto-load .env for node scripts.
  // We load it silently so DATABASE_URL is available.
  loadEnvFile(path.join(appDir, '.env'))
  loadEnvFile(path.join(appDir, '.env.local'))
}

function topNCounts(map, n) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, count: v }))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const appDir = path.resolve(__dirname, '..')
  const repoRoot = path.resolve(appDir, '..')
  const defaultCsvPath = path.join(repoRoot, 'docs', 'data', 'Implicare 2.0 - Email History.csv')
  const csvPath = args.csvPath ? path.resolve(process.cwd(), args.csvPath) : defaultCsvPath

  ensureEnvLoaded(appDir)

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put it in app/.env or export it in your shell.')
    process.exitCode = 1
    return
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`)
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  const startedAt = Date.now()

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    })

    const limitedRows = args.limit ? rows.slice(0, args.limit) : rows

    const sentRows = limitedRows.filter(r => (r.Status || '').toString().trim().toUpperCase() === 'SENT')

    const templates = await prisma.template.findMany({
      select: { id: true, name: true, slug: true }
    })

    const templateByNormName = new Map()
    for (const t of templates) {
      const key = normalizeTemplateName(t.name)
      if (!key) continue
      if (!templateByNormName.has(key)) {
        templateByNormName.set(key, t)
      }
    }

    const responseIds = new Set()
    const missingResponseIdCount = { count: 0 }
    for (const r of sentRows) {
      const responseId = (r.ResponseID || '').toString().trim()
      if (!responseId) {
        missingResponseIdCount.count++
        continue
      }
      responseIds.add(responseId)
    }

    const responseIdList = [...responseIds]

    const submissionsByResponseId = new Map()
    for (const chunk of chunkArray(responseIdList, 500)) {
      const submissions = await prisma.submission.findMany({
        where: { submissionId: { in: chunk } },
        select: { id: true, submissionId: true, email: true }
      })
      for (const s of submissions) {
        submissionsByResponseId.set(s.submissionId, s)
      }
    }

    const missingTemplateCounts = new Map()
    const missingSubmissionCounts = new Map()

    // Map key: `${submissionInternalId}::${templateId}` -> { sentDate: Date|null }
    const desiredByPairKey = new Map()

    for (const r of sentRows) {
      const templateName = (r.TemplateName || '').toString().trim()
      const responseId = (r.ResponseID || '').toString().trim()

      if (!templateName || !responseId) continue

      const lookupKeys = getTemplateLookupKeys(templateName)
      let template = null
      for (const k of lookupKeys) {
        const found = templateByNormName.get(k)
        if (found) {
          template = found
          break
        }
      }
      if (!template) {
        missingTemplateCounts.set(templateName, (missingTemplateCounts.get(templateName) || 0) + 1)
        continue
      }

      const submission = submissionsByResponseId.get(responseId)
      if (!submission) {
        missingSubmissionCounts.set(responseId, (missingSubmissionCounts.get(responseId) || 0) + 1)
        continue
      }

      const sentDate = parseLegacySentDate(r.SentDate)

      const pairKey = `${submission.id}::${template.id}`
      const existing = desiredByPairKey.get(pairKey)

      // Keep the latest timestamp if we have multiple entries.
      if (!existing) {
        desiredByPairKey.set(pairKey, { sentDate })
      } else if (sentDate && (!existing.sentDate || sentDate.getTime() > existing.sentDate.getTime())) {
        desiredByPairKey.set(pairKey, { sentDate })
      }
    }

    const desiredPairs = [...desiredByPairKey.entries()].map(([pairKey, v]) => {
      const [submissionId, templateId] = pairKey.split('::')
      return { submissionId, templateId, sentDate: v.sentDate }
    })

    const internalSubmissionIds = [...new Set(desiredPairs.map(p => p.submissionId))]

    const assignments = internalSubmissionIds.length
      ? await prisma.assignment.findMany({
          where: { submissionId: { in: internalSubmissionIds } },
          select: { id: true, submissionId: true, templateId: true, status: true, processedAt: true }
        })
      : []

    const assignmentByPairKey = new Map()
    for (const a of assignments) {
      assignmentByPairKey.set(`${a.submissionId}::${a.templateId}`, a)
    }

    let wouldUpdate = 0
    let wouldCreate = 0
    let alreadyNonPending = 0
    let missingAssignment = 0
    let updated = 0
    let created = 0
    let updateErrors = 0
    let createErrors = 0
    let wouldMarkSubmissionsProcessed = 0
    let markedSubmissionsProcessed = 0

    const createBatch = []

    const now = new Date()

    // Align imported submissions with webhook processing behavior: if we have legacy
    // email history for a submission, it should not remain 'pending'.
    if (internalSubmissionIds.length) {
      wouldMarkSubmissionsProcessed = internalSubmissionIds.length

      if (!args.dryRun) {
        try {
          const res = await prisma.submission.updateMany({
            where: {
              id: { in: internalSubmissionIds },
              status: 'pending'
            },
            data: {
              status: 'processed',
              processedAt: now
            }
          })
          markedSubmissionsProcessed = res.count || 0
        } catch (e) {
          // Non-fatal: assignment reconciliation still succeeded.
        }
      }
    }

    for (const p of desiredPairs) {
      const a = assignmentByPairKey.get(`${p.submissionId}::${p.templateId}`)
      if (!a) {
        missingAssignment++

        wouldCreate++
        if (!args.dryRun) {
          createBatch.push({
            submissionId: p.submissionId,
            templateId: p.templateId,
            status: 'sent',
            processedAt: p.sentDate || now,
            reasonCodes: ['legacy-email-history']
          })
        }

        continue
      }

      if (a.status !== 'pending') {
        alreadyNonPending++
        continue
      }

      wouldUpdate++

      if (args.dryRun) continue

      try {
        const res = await prisma.assignment.updateMany({
          where: {
            submissionId: p.submissionId,
            templateId: p.templateId,
            status: 'pending'
          },
          data: {
            status: 'sent',
            processedAt: p.sentDate || now
          }
        })
        updated += res.count || 0
      } catch (e) {
        updateErrors++
      }
    }

    if (!args.dryRun && createBatch.length) {
      for (const chunk of chunkArray(createBatch, 500)) {
        try {
          const res = await prisma.assignment.createMany({
            data: chunk,
            skipDuplicates: true
          })
          created += res.count || 0
        } catch (e) {
          createErrors++
        }
      }
    }

    const elapsedMs = Date.now() - startedAt

    const modeLabel = args.dryRun ? 'DRY RUN' : 'APPLY'
    console.log(`Reconcile legacy email history (${modeLabel})`)
    console.log(`CSV: ${csvPath}`)
    console.log(`Rows: ${limitedRows.length} (SENT: ${sentRows.length})`)
    console.log(`Unique responseIds: ${responseIdList.length} (missing ResponseID: ${missingResponseIdCount.count})`)
    console.log(`Templates in DB: ${templates.length}`)
    console.log(`Submissions found: ${submissionsByResponseId.size}/${responseIdList.length}`)
    console.log(`Desired assignment pairs: ${desiredPairs.length}`)
    console.log(`Assignments loaded: ${assignments.length}`)
    console.log(`Would update pending -> sent: ${wouldUpdate}`)
    console.log(`Would create missing as sent: ${wouldCreate}`)
    console.log(`Already non-pending: ${alreadyNonPending}`)
    console.log(`Missing assignments: ${missingAssignment}`)
    console.log(`Would mark submissions processed: ${wouldMarkSubmissionsProcessed}`)
    if (!args.dryRun) {
      console.log(`Updated: ${updated} (errors: ${updateErrors})`)
      console.log(`Created: ${created} (errors: ${createErrors})`)
      console.log(`Marked submissions processed: ${markedSubmissionsProcessed}`)
    }
    console.log(`Elapsed: ${elapsedMs}ms`)

    const topMissingTemplates = topNCounts(missingTemplateCounts, 10)
    const topMissingSubmissions = topNCounts(missingSubmissionCounts, 10)

    if (topMissingTemplates.length) {
      console.log('Top missing templates (by TemplateName):')
      for (const item of topMissingTemplates) {
        console.log(`- ${item.count}x ${item.key}`)
      }
    }

    if (topMissingSubmissions.length) {
      console.log('Top missing submissions (by ResponseID):')
      for (const item of topMissingSubmissions) {
        console.log(`- ${item.count}x ${item.key}`)
      }
    }

    if (args.dryRun) {
      console.log('Run again with --apply to persist updates.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exitCode = 1
})
