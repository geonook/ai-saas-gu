import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Define routes that should be accessible without authentication
const publicRoutes = [
  '/',  // Landing page is public
  '/auth/login',
  '/auth/signup', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
]

// Define routes that authenticated users should be redirected away from
const authRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log(`🎯 [MIDDLEWARE] Processing: ${pathname}`)

  // Skip static assets, Next.js internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/') // Allow ALL API routes without authentication
  ) {
    return NextResponse.next()
  }

  // Handle auth callback specially
  if (pathname === '/auth/callback') {
    console.log('🔄 [MIDDLEWARE] Processing auth callback')
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  try {
    // Update session and get user
    const { supabaseResponse, user } = await updateSession(request)
    
    // Check if route is public (fixed logic to avoid '/' matching all routes)
    const isPublicRoute = publicRoutes.some(route => {
      if (route === '/') {
        return pathname === '/'  // Exact match for root only
      }
      return pathname === route || pathname.startsWith(route + '/')
    })
    
    // Check if route is an auth route
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    
    console.log(`🔍 [MIDDLEWARE] Auth check:`, {
      pathname,
      hasUser: !!user,
      isPublicRoute,
      isAuthRoute,
      userId: user?.id?.substring(0, 8) + '...' || 'none',
      publicRouteMatches: publicRoutes.map(route => ({
        route,
        exactMatch: pathname === route,
        startsWithMatch: route === '/' ? pathname === '/' : pathname.startsWith(route + '/')
      }))
    })
    
    // If user is not authenticated
    if (!user) {
      // Allow access to public routes
      if (isPublicRoute) {
        console.log(`✅ [MIDDLEWARE] Allowing unauthenticated access to public route: ${pathname}`)
        return supabaseResponse
      }
      
      // Redirect to login for protected routes
      console.log(`🔒 [MIDDLEWARE] Redirecting unauthenticated user to login from: ${pathname}`)
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // If user is authenticated
    if (user) {
      // Redirect away from auth routes to avoid loops
      if (isAuthRoute) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo')
        const targetUrl = redirectTo && redirectTo !== '/auth/login' ? redirectTo : '/'
        console.log(`🏠 [MIDDLEWARE] Redirecting authenticated user from ${pathname} to ${targetUrl}`)
        return NextResponse.redirect(new URL(targetUrl, request.url))
      }
      
      // Allow access to all other routes for authenticated users
      console.log(`✅ [MIDDLEWARE] Allowing authenticated access to: ${pathname}`)
      return supabaseResponse
    }
    
    return supabaseResponse
  } catch (error) {
    console.error('❌ [MIDDLEWARE] Error:', error)
    
    // On error, allow access to public routes only
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route)
    )
    
    if (!isPublicRoute) {
      console.log(`🚨 [MIDDLEWARE] Error occurred, redirecting to login from: ${pathname}`)
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    console.log(`⚠️ [MIDDLEWARE] Error occurred but allowing access to public route: ${pathname}`)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}