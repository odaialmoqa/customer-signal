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
    '/auth/callback'
  ]

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // For public routes, just continue without auth check
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check authentication
  return await updateSession(request)
}

// Apply monitoring and rate limiting to the middleware
export const middleware = withRateLimit()(withRequestMonitoring(baseMiddleware))

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}