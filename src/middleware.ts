import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { withRequestMonitoring, withRateLimit } from './lib/middleware/request-monitor'

async function baseMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes without authentication
  const publicRoutes = [
    '/',
    '/public',
    '/auth-test',
    '/demo',
    '/help',
    '/api/health',
    '/login',
    '/signup',
    '/auth/callback',
    '/index.html'
  ]

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // For public routes, just continue without auth check
  if (isPublicRoute) {
    console.log(`Public route accessed: ${pathname}`)
    // Create a simple response that bypasses all auth
    return NextResponse.next()
  }

  console.log(`Protected route accessed: ${pathname}`)
  // For protected routes, check authentication
  return await updateSession(request)
}

// Apply monitoring and rate limiting to the middleware
export const middleware = withRateLimit()(withRequestMonitoring(baseMiddleware))

export const config = {
  matcher: [
    /*
     * Temporarily disable middleware for debugging
     * Only match very specific protected routes
     */
    '/dashboard/:path*',
    '/settings/:path*',
    '/analytics/:path*',
  ],
}