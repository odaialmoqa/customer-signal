import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'
import { withRequestMonitoring, withRateLimit } from './lib/middleware/request-monitor'

async function baseMiddleware(request: NextRequest) {
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