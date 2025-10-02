import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward the request to n8n webhook
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_IMAGE_GENERATION_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL not configured' }, 
        { status: 500 }
      )
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Webhook error: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.text()
    
    // Try to parse as JSON, fallback to text
    let result
    try {
      result = JSON.parse(data)
    } catch {
      result = { taskId: data.trim() }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate video API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    )
  }
}