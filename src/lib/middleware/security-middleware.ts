import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { securityService } from '../services/security';
import { logger } from '../utils/logger-server';

export interface SecurityMiddlewareOptions {
  enableAuditLogging?: boolean;
  enableSecurityEventLogging?: boolean;
  sensitiveRoutes?: string[];
  rateLimitByIP?: boolean;
}

const defaultOptions: SecurityMiddlewareOptions = {
  enableAuditLogging: true,
  enableSecurityEventLogging: true,
  sensitiveRoutes: ['/api/admin', '/api/gdpr', '/api/security'],
  rateLimitByIP: true
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return async function securityMiddleware(request: NextRequest) {
    const response = NextResponse.next();
    
    try {
      // Extract security context from request
      const userAgent = request.headers.get('user-agent') || '';
      const ipAddress = getClientIP(request);
      const sessionId = request.cookies.get('session-id')?.value || '';
      
      // Create Supabase client
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              response.cookies.set(name, value, options);
            },
            remove(name: string, options: any) {
              response.cookies.delete(name);
            },
          },
        }
      );

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError && config.enableSecurityEventLogging) {
        logger.warn('Failed to get user in security middleware:', userError);
      }

      // Set security context for audit logging
      if (config.enableAuditLogging && user) {
        await securityService.setSecurityContext({
          userEmail: user.email,
          userAgent,
          ipAddress,
          sessionId
        });
      }

      // Rate limiting for sensitive routes
      if (config.rateLimitByIP && isSensitiveRoute(request.nextUrl.pathname, config.sensitiveRoutes!)) {
        const rateLimitResult = await checkRateLimit(ipAddress, request.nextUrl.pathname);
        
        if (!rateLimitResult.allowed) {
          // Log security event for rate limit exceeded
          if (config.enableSecurityEventLogging && user) {
            const tenantId = await getUserTenantId(supabase, user.id);
            if (tenantId) {
              await securityService.logSecurityEvent(
                tenantId,
                'rate_limit_exceeded',
                'medium',
                `Rate limit exceeded for ${request.nextUrl.pathname}`,
                {
                  ipAddress,
                  userAgent,
                  path: request.nextUrl.pathname,
                  method: request.method
                }
              );
            }
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfter: rateLimitResult.retryAfter
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': rateLimitResult.retryAfter.toString()
              }
            }
          );
        }
      }

      // Log security events for sensitive operations
      if (config.enableSecurityEventLogging && user && isSensitiveRoute(request.nextUrl.pathname, config.sensitiveRoutes!)) {
        const tenantId = await getUserTenantId(supabase, user.id);
        if (tenantId) {
          await securityService.logSecurityEvent(
            tenantId,
            'sensitive_route_access',
            'medium',
            `Access to sensitive route: ${request.nextUrl.pathname}`,
            {
              ipAddress,
              userAgent,
              path: request.nextUrl.pathname,
              method: request.method
            }
          );
        }
      }

      // Validate data access for API routes
      if (request.nextUrl.pathname.startsWith('/api/') && user) {
        const tenantId = await getUserTenantId(supabase, user.id);
        if (tenantId) {
          const hasAccess = await securityService.validateDataAccess(
            user.id,
            tenantId,
            request.nextUrl.pathname,
            getActionFromMethod(request.method)
          );

          if (!hasAccess) {
            return new NextResponse(
              JSON.stringify({
                error: 'Unauthorized access',
                message: 'You do not have permission to access this resource'
              }),
              {
                status: 403,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          }
        }
      }

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      
      // Add CSP header for enhanced security
      const cspHeader = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'"
      ].join('; ');
      
      response.headers.set('Content-Security-Policy', cspHeader);

      return response;

    } catch (error) {
      logger.error('Security middleware error:', error);
      
      // Don't block the request on middleware errors, but log them
      return response;
    }
  };
}

function getClientIP(request: NextRequest): string {
  // Try various headers to get the real client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return request.ip || 'unknown';
}

function isSensitiveRoute(pathname: string, sensitiveRoutes: string[]): boolean {
  return sensitiveRoutes.some(route => pathname.startsWith(route));
}

async function checkRateLimit(
  ipAddress: string, 
  path: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  const key = `${ipAddress}:${path}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // New window or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, retryAfter: 0 };
  }
  
  if (current.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true, retryAfter: 0 };
}

async function getUserTenantId(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.tenant_id;
  } catch (error) {
    logger.error('Failed to get user tenant ID:', error);
    return null;
  }
}

function getActionFromMethod(method: string): 'read' | 'write' | 'delete' {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'DELETE':
      return 'delete';
    case 'POST':
    case 'PUT':
    case 'PATCH':
    default:
      return 'write';
  }
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes