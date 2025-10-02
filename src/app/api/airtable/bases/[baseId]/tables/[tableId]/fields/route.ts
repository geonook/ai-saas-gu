import { NextRequest, NextResponse } from 'next/server';
import { getAirtableTables } from '@/lib/airtable';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string; tableId: string }> }
) {
  try {
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
    
    console.log('🔍 Fields API called with baseId:', baseId, 'tableId:', tableId);
    
    if (!baseId || !tableId) {
      return NextResponse.json(
        { error: 'Base ID and Table ID are required' },
        { status: 400 }
      );
    }

    // Use the same function as tables API to get table data with fields
    const tables = await getAirtableTables(baseId);
    console.log('📊 Found tables:', tables.map(t => ({ id: t.id, name: t.name })));
    
    // Find the specific table and return its fields
    const table = tables.find((t) => t.id === tableId);
    
    if (!table) {
      console.error('❌ Table not found. Available tables:', tables.map(t => t.id));
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found table:', table.name, 'with', table.fields?.length || 0, 'fields');
    
    return NextResponse.json({
      success: true,
      fields: table.fields || [],
    });
  } catch (error) {
    console.error('Error fetching table fields:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}