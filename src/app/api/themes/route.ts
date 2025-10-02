import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_IMAGE_GENERATION_BASE_ID || 'appCbDEJPUGe2b6bL'
const AIRTABLE_TABLE_NAME = 'Theme'

interface AirtableField {
  Name?: string
  Image?: Array<{
    id: string
    url: string
    filename: string
    size: number
    type: string
    width?: number
    height?: number
  }>
}

interface AirtableRecord {
  id: string
  createdTime: string
  fields: AirtableField
}

interface AirtableResponse {
  records: AirtableRecord[]
  offset?: string
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.AIRTABLE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Airtable API key is not configured' },
      { status: 500 }
    )
  }

  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('pageSize') || '100'
    const offset = searchParams.get('offset')
    const filterByFormula = searchParams.get('filterByFormula')

    // Build query parameters
    const queryParams = new URLSearchParams({
      pageSize,
    })

    if (offset) {
      queryParams.append('offset', offset)
    }

    if (filterByFormula) {
      queryParams.append('filterByFormula', filterByFormula)
    }

    // Only select Name and Image fields
    queryParams.append('fields[]', 'Name')
    queryParams.append('fields[]', 'Image')

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?${queryParams.toString()}`

    console.log('🔍 Fetching themes from:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Airtable API error:', errorData)
      return NextResponse.json(
        { error: `Airtable API Error: ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      )
    }

    const data: AirtableResponse = await response.json()
    
    // Transform data to a more usable format
    const themes = data.records
      .filter(record => record.fields.Name && record.fields.Image && record.fields.Image.length > 0)
      .map(record => ({
        id: record.id,
        name: record.fields.Name!,
        imageUrl: record.fields.Image![0].url,
        imageFilename: record.fields.Image![0].filename,
        imageSize: record.fields.Image![0].size,
        imageType: record.fields.Image![0].type,
        createdTime: record.createdTime
      }))

    console.log('✅ Successfully fetched themes:', themes.length)

    return NextResponse.json({
      themes,
      offset: data.offset
    })

  } catch (error) {
    console.error('❌ Error fetching themes:', error)
    return NextResponse.json(
      { error: `Failed to fetch themes: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}