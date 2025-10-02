import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ [OAuth Callback] Auth exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user) {
        console.log('✅ [OAuth Callback] OAuth authentication successful for user:', data.user.id)
        
        // Check if user was created recently to determine if they're new
        const userCreatedAt = new Date(data.user.created_at)
        const now = new Date()
        const timeDiff = now.getTime() - userCreatedAt.getTime()
        const isNewUser = timeDiff <= 30000 // User created within 30 seconds
        
        // Database trigger will handle profile creation with correct registration_method
        // for OAuth providers (google, github)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [OAuth Callback] User info:', {
            userId: data.user.id,
            email: data.user.email,
            provider: data.user.app_metadata?.provider,
            isNewUser,
            userCreatedAt
          })
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`)
    } catch (error) {
      console.error('❌ [OAuth Callback] Unexpected error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('An unexpected error occurred')}`)
    }
  }

  // No authorization code provided
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('No authorization code provided')}`)
}