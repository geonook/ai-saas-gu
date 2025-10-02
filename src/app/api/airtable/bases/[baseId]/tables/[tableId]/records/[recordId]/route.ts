import { NextRequest, NextResponse } from 'next/server';
import { AirtableError } from '@/types/airtable';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string; tableId: string; recordId: string }> }
) {
  try {
    const { baseId, tableId, recordId } = await params;
    
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

    console.log('🗑️ Deleting record:', { baseId, tableId, recordId });

    // Airtable API endpoint for deleting a single record
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData: AirtableError = await response.json();
      console.error('❌ Airtable delete error:', errorData);
      return NextResponse.json(
        { error: `Airtable API Error: ${errorData.error.message}` },
        { status: response.status }
      );
    }

    const deletedRecord = await response.json();
    console.log('✅ Record deleted successfully:', deletedRecord.id);

    return NextResponse.json({
      success: true,
      deleted: true,
      id: deletedRecord.id,
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}