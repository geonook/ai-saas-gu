import { NextRequest, NextResponse } from 'next/server';
import { AirtableError } from '@/types/airtable';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string; tableId: string }> }
) {
  try {
    // 先解構參數
    const { baseId, tableId } = await params;
    
    // 🛡️ 第二層防護：驗證用戶身份與資源權限
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login to access this resource' },
        { status: 401 }
      );
    }

    // 🔐 智能安全檢查：區分 YouTube Analytics 和 Airtable 管理用途
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source'); // 'youtube-analytics' 或 null
    
    if (source === 'youtube-analytics') {
      // YouTube Analytics 專用：只能訪問特定 Base
      const allowedBaseId = process.env.NEXT_PUBLIC_YOUTUBE_ANALYTICS_BASE_ID;
      if (!allowedBaseId || baseId !== allowedBaseId) {
        return NextResponse.json(
          { error: 'Access denied - Invalid YouTube Analytics base ID' },
          { status: 403 }
        );
      }
    }
    // Airtable 管理用途：允許訪問任何 Base（已透過 JWT 認證）
    const apiKey = process.env.AIRTABLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Airtable API key is not configured' },
        { status: 500 }
      );
    }

    // Get query parameters for pagination and filtering
    const pageSize = searchParams.get('pageSize') || '100';
    const offset = searchParams.get('offset') || '';
    const sort = searchParams.get('sort') || '';
    const filterByFormula = searchParams.get('filterByFormula') || '';

    // Build query parameters
    const queryParams = new URLSearchParams({
      pageSize,
    });
    
    if (offset) queryParams.append('offset', offset);
    if (sort) queryParams.append('sort[0][field]', sort);
    if (filterByFormula) queryParams.append('filterByFormula', filterByFormula);

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData: AirtableError = await response.json();
      return NextResponse.json(
        { error: `Airtable API Error: ${errorData.error.message}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      records: data.records || [],
      offset: data.offset,
    });
  } catch (error) {
    console.error('Error fetching table records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH method to update a specific record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string; tableId: string }> }
) {
  try {
    const { baseId, tableId } = await params;
    const apiKey = process.env.AIRTABLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Airtable API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { recordId, fields } = body;
    
    console.log('🔄 Updating record:', { recordId, fields });

    if (!recordId || !fields) {
      return NextResponse.json(
        { error: 'Record ID and fields are required' },
        { status: 400 }
      );
    }

    // Airtable API endpoint for updating a single record
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: fields,
        }),
      }
    );

    if (!response.ok) {
      const errorData: AirtableError = await response.json();
      console.error('❌ Airtable update error:', errorData);
      return NextResponse.json(
        { error: `Airtable API Error: ${errorData.error.message}` },
        { status: response.status }
      );
    }

    const updatedRecord = await response.json();
    console.log('✅ Record updated successfully:', updatedRecord.id);

    return NextResponse.json({
      success: true,
      record: updatedRecord,
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}