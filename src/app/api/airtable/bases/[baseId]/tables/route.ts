import { NextRequest, NextResponse } from 'next/server';
import { getAirtableTables } from '@/lib/airtable';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;
    
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
    
    if (!baseId) {
      return NextResponse.json(
        { success: false, error: 'Base ID is required' },
        { status: 400 }
      );
    }

    const tables = await getAirtableTables(baseId);
    
    return NextResponse.json({ 
      success: true, 
      tables 
    });
  } catch (error) {
    console.error('Error in /api/airtable/bases/[baseId]/tables:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}