import { createBrowserClient } from '@supabase/ssr'
import { type Database } from '@/types/database'

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let configPromise: Promise<{ supabaseUrl: string; supabaseAnonKey: string }> | null = null

/**
 * Fetch runtime configuration from API endpoint
 * This avoids the build-time inlining issue with NEXT_PUBLIC_* variables
 */
async function getRuntimeConfig() {
  if (configPromise) {
    return configPromise
  }

  configPromise = (async () => {
    try {
      // Try to fetch from runtime config endpoint
      const response = await fetch('/api/env', {
        cache: 'force-cache',
      })

      if (response.ok) {
        const data = await response.json()
        const { url, anonKey } = data.supabase

        if (url && anonKey && !url.includes('placeholder')) {
          console.log('✅ Using runtime config from API endpoint')
          return { supabaseUrl: url, supabaseAnonKey: anonKey }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch runtime config, falling back to process.env:', error)
    }

    // Fallback to process.env (for local development)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase environment variables missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        url: supabaseUrl || 'MISSING',
      })
      throw new Error('Missing Supabase environment variables. Please check your configuration.')
    }

    // Check for placeholder values
    if (supabaseUrl.includes('placeholder')) {
      console.error('❌ Supabase URL contains placeholder value:', supabaseUrl)
      throw new Error('Supabase URL is not configured. Please update environment variables.')
    }

    console.log('✅ Using environment variables from process.env')
    return { supabaseUrl, supabaseAnonKey }
  })()

  return configPromise
}

export const createClient = async () => {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = await getRuntimeConfig()

    console.log('🔧 Creating Supabase client with URL:', supabaseUrl)

    supabaseClient = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    )
  }
  return supabaseClient
}