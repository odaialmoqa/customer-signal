import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '../services/monitoring';
import { logger } from '../utils/logger';
import { ErrorReporter } from '../types/error';

export function withRequestMonitoring(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const errorReporter = ErrorReporter.getInstance();
    
    // Add request ID to headers for tracing
    const requestContext = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString()
    };

    logger.info('Request started', requestContext);

    let response: NextResponse;
    let statusCode = 200;
    
    try {
      response = await handler(req, context);
      statusCode = response.status;
      
      return response;
    } catch (error) {
      statusCode = 500;
      
      // Report error
      if (error instanceof Error) {
        errorReporter.reportError(error, {
          ...requestContext,
          severity: 'high'
        });
      }
      
      throw error;
    } finally {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Record performance metrics
      performanceMonitor.recordMetric({
        service: 'customer-signal-api',
        endpoint: getEndpointName(req.url),
        responseTime,
        timestamp: new Date(),
        statusCode,
        memoryUsage: getMemoryUsage(),
        cpuUsage: 0, // Would need process monitoring
        activeConnections: 0 // Would need connection tracking
      });

      // Log request completion
      logger.logRequest(
        req.method,
        req.url,
        statusCode,
        responseTime,
        {
          ...requestContext,
          responseTime,
          statusCode
        }
      );

      // Add response headers for monitoring
      if (response!) {
        response.headers.set('X-Request-ID', requestId);
        response.headers.set('X-Response-Time', responseTime.toString());
      }
    }
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function getEndpointName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Normalize dynamic routes
    return pathname
      .replace(/\/api\//, '')
      .replace(/\/[0-9a-f-]{36}/, '/:id') // UUIDs
      .replace(/\/\d+/, '/:id') // Numeric IDs
      .replace(/\/[^\/]+$/, '/:param'); // Last segment parameters
  } catch {
    return 'unknown';
  }
}

function getMemoryUsage(): number {
  // Edge runtime compatible memory usage
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
  return 0;
}

// Rate limiting middleware
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private readonly windowMs: number = 60000, // 1 minute
    private readonly maxRequests: number = 100
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests) {
      const recentRequests = requests.filter(time => time > windowStart);
      
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Cleanup rate limiter every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

export function withRateLimit(
  rateLimiter: RateLimiter = globalRateLimiter,
  getIdentifier: (req: NextRequest) => string = (req) => getClientIP(req)
) {
  return function(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
      const identifier = getIdentifier(req);
      
      if (!rateLimiter.isAllowed(identifier)) {
        const resetTime = rateLimiter.getResetTime(identifier);
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        
        logger.warn('Rate limit exceeded', {
          identifier,
          url: req.url,
          method: req.method,
          retryAfter
        });

        return NextResponse.json(
          {
            error: {
              message: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter
            }
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetTime.toString()
            }
          }
        );
      }

      const response = await handler(req, context);
      
      // Add rate limit headers
      const remaining = rateLimiter.getRemainingRequests(identifier);
      const resetTime = rateLimiter.getResetTime(identifier);
      
      response.headers.set('X-RateLimit-Limit', rateLimiter['maxRequests'].toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', resetTime.toString());
      
      return response;
    };
  };
}