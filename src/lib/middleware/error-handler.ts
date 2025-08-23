import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../utils/logger';
import { ErrorContext, ErrorSeverity } from '../types/error';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = 'medium',
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = context;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 400, 'low', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context: ErrorContext = {}) {
    super(message, 401, 'medium', context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context: ErrorContext = {}) {
    super(message, 403, 'medium', context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`${resource} not found`, 404, 'low', context);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: ErrorContext = {}) {
    super(message, 429, 'medium', context);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error, context: ErrorContext = {}) {
    super(`External service error: ${service}`, 502, 'high', {
      ...context,
      service,
      originalError: originalError?.message
    });
    this.name = 'ExternalServiceError';
  }
}

export function errorHandler(error: Error, request?: NextRequest): NextResponse {
  const errorId = generateErrorId();
  
  // Log the error with context
  const errorContext: ErrorContext = {
    errorId,
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
    stack: error.stack
  };

  if (error instanceof AppError) {
    logger.error('Application error occurred', {
      ...errorContext,
      ...error.context,
      severity: error.severity,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    });

    // Send alert for high severity errors
    if (error.severity === 'high') {
      notifyAdmins(error.severity, error.message, errorContext);
    }

    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.name,
          errorId,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
      },
      { status: error.statusCode }
    );
  }

  // Handle unexpected errors
  logger.error('Unexpected error occurred', {
    ...errorContext,
    severity: 'high' as ErrorSeverity,
    isOperational: false
  });

  notifyAdmins('high', 'Unexpected server error', errorContext);

  return NextResponse.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        errorId,
        ...(process.env.NODE_ENV === 'development' && { 
          originalMessage: error.message,
          stack: error.stack 
        })
      }
    },
    { status: 500 }
  );
}

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function notifyAdmins(severity: ErrorSeverity, message: string, context: ErrorContext): Promise<void> {
  try {
    // In a real implementation, this would send to Slack, email, or monitoring service
    logger.warn('Admin notification triggered', {
      severity,
      message,
      context,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement actual notification service
    // await notificationService.sendAlert({
    //   severity,
    //   message,
    //   context,
    //   channel: 'alerts'
    // });
  } catch (notificationError) {
    logger.error('Failed to send admin notification', {
      originalError: message,
      notificationError: notificationError instanceof Error ? notificationError.message : 'Unknown error'
    });
  }
}

// Async error handler wrapper for API routes
export function asyncHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return errorHandler(error instanceof Error ? error : new Error('Unknown error'), req);
    }
  };
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ExternalServiceError(serviceName, undefined, {
          circuitBreakerState: 'OPEN',
          failures: this.failures
        });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.1 * delay;
      
      logger.warn(`Operation failed, retrying in ${delay + jitter}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message
      });

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw new AppError(
    `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
    500,
    'high',
    { maxRetries, lastError: lastError.message }
  );
}