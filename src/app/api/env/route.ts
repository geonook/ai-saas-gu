import { NextResponse } from 'next/server';

/**
 * Runtime environment configuration endpoint
 * This endpoint provides client-side environment variables at runtime,
 * avoiding the build-time inlining issue with NEXT_PUBLIC_* variables
 */
export async function GET() {
  // Return public environment variables that are safe to expose to the client
  const config = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    // Add other public configs if needed
    debug: process.env.NEXT_PUBLIC_SUPABASE_DEBUG === 'true',
  };

  // Validate critical variables
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('❌ Missing Supabase environment variables in runtime config:', {
      hasUrl: !!config.supabase.url,
      hasKey: !!config.supabase.anonKey,
      url: config.supabase.url || 'MISSING'
    });
  }

  // Log config for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Runtime config endpoint called:', {
      url: config.supabase.url,
      hasKey: !!config.supabase.anonKey
    });
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
