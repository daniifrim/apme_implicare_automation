import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const dataDir = path.join(process.cwd(), '..', 'docs', 'data')

interface CSVRow {
  'Submission ID': string
  'Submission time': string
  'Cum te numești?': string
  'Număr de telefon': string
  'Email': string
  'Căți ani ai?': string
  'Unde locuiești?': string
  'În ce oraș din România locuiești?': string
  'În ce oraș și țară locuiești?': string
  'La ce biserică mergi?': string
  [key: string]: string
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function parseLocation(row: CSVRow): { city: string; country: string; locationType: string } {
  const romaniaCity = row['În ce oraș din România locuiești?']?.trim()
  const diasporaLocation = row['În ce oraș și țară locuiești?']?.trim()
  const whereTheyLive = row['Unde locuiești?']?.trim()
  
  if (romaniaCity) {
    return { city: romaniaCity, country: 'România', locationType: 'romania' }
  }
  
  if (diasporaLocation) {
    // Parse "City, Country" format
    const parts = diasporaLocation.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      return { city: parts[0], country: parts[parts.length - 1], locationType: 'diaspora' }
    }
    return { city: diasporaLocation, country: '', locationType: 'diaspora' }
  }
  
  if (whereTheyLive?.includes('Diaspora')) {
    return { city: '', country: '', locationType: 'diaspora' }
  }
  
  return { city: '', country: '', locationType: 'romania' }
}

export async function POST(_request: NextRequest) {
  try {
    const csvPath = path.join(dataDir, 'Implicare 2.0 - Implicare 2.0.csv')
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: 'CSV file not found' },
        { status: 404 }
      )
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    }) as CSVRow[]
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    // Get or create a default form
    let form = await prisma.filloutForm.findFirst()
    
    if (!form) {
      form = await prisma.filloutForm.create({
        data: {
          formId: 'implicare-form',
          name: 'Implicare Form',
          status: 'active'
        }
      })
    }
    
    for (const row of records) {
      try {
        const submissionId = row['Submission ID']

        if (!submissionId) {
          results.skipped++
          continue
        }
        
        // Check if already exists
        const existing = await prisma.submission.findUnique({
          where: { submissionId: submissionId }
        })
        
        if (existing) {
          results.skipped++
          continue
        }
        
        const { firstName, lastName } = parseName(row['Cum te numești?'] || '')
        const { city, country, locationType } = parseLocation(row)
        
        // Parse submission time
        let submissionTime: Date
        try {
          submissionTime = new Date(row['Submission time'])
          if (isNaN(submissionTime.getTime())) {
            submissionTime = new Date()
          }
        } catch {
          submissionTime = new Date()
        }
        
        // Parse age
        let age: number | null = null
        try {
          age = row['Căți ani ai?'] ? parseInt(row['Căți ani ai?']) : null
        } catch {
          age = null
        }
        
        // Build raw data object with all fields
        const rawData: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          if (value) {
            rawData[key] = value
          }
        }
        
        await prisma.submission.create({
          data: {
            submissionId: submissionId,
            formId: form.id,
            submissionTime: submissionTime,
            firstName,
            lastName,
            email: row['Email'] || null,
            phone: row['Număr de telefon'] || null,
            locationType,
            city,
            country,
            church: row['La ce biserică mergi?'] || null,
            rawData,
            status: 'pending'
          }
        })
        
        results.imported++
      } catch (error) {
        results.errors.push(`Failed to import ${row['Submission ID']}: ${error}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} submissions, skipped ${results.skipped} existing submissions`
    })
    
  } catch (error) {
    console.error('Error importing submissions:', error)
    return NextResponse.json(
      { error: 'Failed to import submissions' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const csvPath = path.join(dataDir, 'Implicare 2.0 - Implicare 2.0.csv')
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: 'CSV file not found' },
        { status: 404 }
      )
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    }) as CSVRow[]
    
    return NextResponse.json({
      count: records.length,
      sample: records.slice(0, 3).map((r) => ({
        id: r['Submission ID'],
        name: r['Cum te numești?'],
        email: r['Email']
      }))
    })
    
  } catch (error) {
    console.error('Error listing submissions:', error)
    return NextResponse.json(
      { error: 'Failed to list submissions' },
      { status: 500 }
    )
  }
}
