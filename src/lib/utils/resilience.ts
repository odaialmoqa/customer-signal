import { logger } from './logger';
import { AppError, ExternalServiceError } from '../middleware/error-handler';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: (error: Error) => boolean;
}

export interface BulkheadConfig {
  maxConcurrent: number;
  maxQueue: number;
  timeout: number;
}

// Retry mechanism with exponential backoff and jitter
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitter = true,
    retryCondition = (error: Error) => !(error instanceof AppError && error.statusCode < 500)
  } = config;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info(`Operation succeeded after retry`, {
          operationName,
          attempt,
          maxAttempts
        });
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff and optional jitter
      let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
      }

      logger.warn(`Operation failed, retrying`, {
        operationName,
        attempt,
        maxAttempts,
        delay,
        error: lastError.message
      });

      await sleep(delay);
    }
  }

  throw new AppError(
    `Operation '${operationName}' failed after ${maxAttempts} attempts: ${lastError.message}`,
    500,
    'high',
    { 
      operationName,
      maxAttempts,
      lastError: lastError.message,
      stack: lastError.stack
    }
  );
}

// Circuit breaker pattern
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private requestCount: number = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly name: string = 'circuit-breaker'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`Circuit breaker transitioning to HALF_OPEN`, { name: this.name });
      } else {
        throw new ExternalServiceError(
          this.name,
          new Error('Circuit breaker is OPEN'),
          {
            circuitBreakerState: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private onSuccess(): void {
    this.requestCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // If we have enough successful requests, close the circuit
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.requestCount = 0;
        logger.info(`Circuit breaker closed after successful recovery`, { name: this.name });
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  private onFailure(error: Error): void {
    this.requestCount++;
    
    // Check if this is an expected error that shouldn't trigger the circuit breaker
    if (this.config.expectedErrors && this.config.expectedErrors(error)) {
      return;
    }

    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened from HALF_OPEN state`, {
        name: this.name,
        error: error.message
      });
    } else if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened due to failure threshold`, {
        name: this.name,
        failures: this.failures,
        threshold: this.config.failureThreshold,
        error: error.message
      });
    }
  }

  getState(): {
    state: string;
    failures: number;
    successCount: number;
    requestCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = 0;
    logger.info(`Circuit breaker manually reset`, { name: this.name });
  }
}

// Bulkhead pattern for resource isolation
export class Bulkhead {
  private activeRequests: number = 0;
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(
    private readonly config: BulkheadConfig,
    private readonly name: string = 'bulkhead'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue if still there
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        
        reject(new AppError(
          `Bulkhead timeout: operation exceeded ${this.config.timeout}ms`,
          408,
          'medium',
          { bulkheadName: this.name, timeout: this.config.timeout }
        ));
      }, this.config.timeout);

      const queueItem = {
        operation,
        resolve: (value: T) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (error: any) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeout: timeoutId
      };

      if (this.activeRequests < this.config.maxConcurrent) {
        this.executeImmediately(queueItem);
      } else if (this.queue.length < this.config.maxQueue) {
        this.queue.push(queueItem);
        logger.debug(`Request queued in bulkhead`, {
          name: this.name,
          queueSize: this.queue.length,
          activeRequests: this.activeRequests
        });
      } else {
        clearTimeout(timeoutId);
        reject(new AppError(
          `Bulkhead queue full: cannot accept more requests`,
          503,
          'medium',
          {
            bulkheadName: this.name,
            maxQueue: this.config.maxQueue,
            maxConcurrent: this.config.maxConcurrent
          }
        ));
      }
    });
  }

  private async executeImmediately<T>(queueItem: {
    operation: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }): Promise<void> {
    this.activeRequests++;
    
    try {
      const result = await queueItem.operation();
      queueItem.resolve(result);
    } catch (error) {
      queueItem.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeRequests < this.config.maxConcurrent) {
      const nextItem = this.queue.shift()!;
      this.executeImmediately(nextItem);
    }
  }

  getStats(): {
    activeRequests: number;
    queueSize: number;
    maxConcurrent: number;
    maxQueue: number;
  } {
    return {
      activeRequests: this.activeRequests,
      queueSize: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
      maxQueue: this.config.maxQueue
    };
  }
}

// Timeout wrapper
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AppError(
        `Operation '${operationName}' timed out after ${timeoutMs}ms`,
        408,
        'medium',
        { operationName, timeout: timeoutMs }
      ));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Fallback mechanism
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  operationName: string = 'operation'
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (primaryError) {
    logger.warn(`Primary operation failed, attempting fallback`, {
      operationName,
      primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error'
    });

    try {
      const result = await fallbackOperation();
      logger.info(`Fallback operation succeeded`, { operationName });
      return result;
    } catch (fallbackError) {
      logger.error(`Both primary and fallback operations failed`, {
        operationName,
        primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error',
        fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      });

      // Throw the original error, not the fallback error
      throw primaryError;
    }
  }
}

// Utility function for sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful degradation helper
export class GracefulDegradation {
  private features: Map<string, boolean> = new Map();
  private fallbacks: Map<string, () => any> = new Map();

  setFeatureStatus(feature: string, enabled: boolean): void {
    this.features.set(feature, enabled);
    logger.info(`Feature status updated`, { feature, enabled });
  }

  setFallback<T>(feature: string, fallback: () => T): void {
    this.fallbacks.set(feature, fallback);
  }

  async executeWithDegradation<T>(
    feature: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const isEnabled = this.features.get(feature) ?? true;
    
    if (!isEnabled) {
      const fallback = this.fallbacks.get(feature);
      if (fallback) {
        logger.info(`Using fallback for disabled feature`, { feature });
        return fallback();
      } else {
        throw new AppError(
          `Feature '${feature}' is disabled and no fallback is available`,
          503,
          'medium',
          { feature }
        );
      }
    }

    try {
      return await operation();
    } catch (error) {
      // If operation fails, try fallback
      const fallback = this.fallbacks.get(feature);
      if (fallback) {
        logger.warn(`Operation failed, using fallback`, {
          feature,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return fallback();
      }
      throw error;
    }
  }

  isFeatureEnabled(feature: string): boolean {
    return this.features.get(feature) ?? true;
  }

  getAllFeatures(): Record<string, boolean> {
    return Object.fromEntries(this.features);
  }
}

export const gracefulDegradation = new GracefulDegradation();