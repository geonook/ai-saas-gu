import { NextRequest, NextResponse } from 'next/server';

type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH'

interface Recommendation {
  priority: PriorityLevel
  issue: string
  solution: string
  docs?: string
}

interface ApiStatus {
  configured: boolean
  ready: boolean
}

interface DebugConfig {
  env: Record<string, 'CONFIGURED' | 'MISSING'>
  apis: {
    youtube: ApiStatus
    apify: ApiStatus
    supabase: ApiStatus
  }
  recommendations: Recommendation[]
}

export async function GET(request: NextRequest) {
  try {
    const recommendations: Recommendation[] = []

    const config: DebugConfig = {
      // Environment variables check
      env: {
        YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? 'CONFIGURED' : 'MISSING',
        APIFY_API_KEY: process.env.APIFY_API_KEY ? 'CONFIGURED' : 'MISSING',
        APIFY_YOUTUBE_SCRAPER_ACTOR_ID: process.env.APIFY_YOUTUBE_SCRAPER_ACTOR_ID ? 'CONFIGURED' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURED' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'CONFIGURED' : 'MISSING',
      },
      // API status
      apis: {
        youtube: {
          configured: !!process.env.YOUTUBE_API_KEY,
          ready: !!process.env.YOUTUBE_API_KEY,
        },
        apify: {
          configured: !!(process.env.APIFY_API_KEY && process.env.APIFY_YOUTUBE_SCRAPER_ACTOR_ID),
          ready: !!(process.env.APIFY_API_KEY && process.env.APIFY_YOUTUBE_SCRAPER_ACTOR_ID),
        },
        supabase: {
          configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          ready: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        }
      },
      // Recommendations
      recommendations
    };

    // Add recommendations based on configuration
    if (!config.apis.youtube.configured && !config.apis.apify.configured) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'No video scraping APIs configured',
        solution: 'Configure either YOUTUBE_API_KEY or Apify (APIFY_API_KEY + APIFY_YOUTUBE_SCRAPER_ACTOR_ID)',
        docs: 'See .env.local.template for instructions'
      });
    }

    if (!config.apis.supabase.configured) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Supabase not configured',
        solution: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
        docs: 'Get these from your Supabase project settings'
      });
    }

    if (config.apis.youtube.configured && !config.apis.apify.configured) {
      recommendations.push({
        priority: 'LOW',
        issue: 'Only YouTube API configured',
        solution: 'Consider adding Apify as backup for rate limiting',
        docs: 'Apify provides more reliable scraping with higher quotas'
      });
    }

    console.log('🔍 Debug API configuration check:', config);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config,
      canScrapeVideos: config.apis.youtube.ready || config.apis.apify.ready,
      canUseApp: config.apis.supabase.ready
    });
  } catch (error) {
    console.error('❌ Debug config check failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Configuration check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
