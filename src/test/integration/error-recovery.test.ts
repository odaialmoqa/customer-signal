import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestMonitoring, withRateLimit, RateLimiter } from '../../lib/middleware/request-monitor';
import { performanceMonitor, setupDefaultHealthChecks } from '../../lib/services/monitoring';
import { withRetry, CircuitBreaker } from '../../lib/utils/resilience';
import { AppError, ExternalServiceError } from '../../lib/middleware/error-handler';

// Mock external dependencies
vi.mock('../../lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logRequest: vi.fn(),
    logPerformanceMetric: vi.fn()
  }
}));

describe('Error Recovery Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear performance monitor state
    performanceMonitor['metrics'].clear();
    performanceMonitor['alerts'].clear();
    performanceMonitor['healthChecks'].clear();
  });

  describe('API Request Error Handling', () => {
    it('should handle and monitor API request failures', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new AppError('Database connection failed', 500, 'high'));
      const monitoredHandler = withRequestMonitoring(failingHandler);
      
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: { 'user-agent': 'test-agent' }
      });

      await expect(monitoredHandler(request)).rejects.toThrow('Database connection failed');
      
      // Should have recorded metrics even for failed requests
      const metrics = performanceMonitor.getMetrics('customer-signal-api');
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].statusCode).toBe(500);
    });

    it('should apply rate limiting and handle rate limit errors', async () => {
      const rateLimiter = new RateLimiter(1000, 2); // 2 requests per second
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const rateLimitedHandler = withRateLimit(rateLimiter)(handler);
      
      const request = new NextRequest('http://localhost/api/test');

      // First two requests should succeed
      await rateLimitedHandler(request);
      await rateLimitedHandler(request);
      
      // Third request should be rate limited
      const response = await rateLimitedHandler(request);
      expect(response.status).toBe(429);
      
      const body = await response.json();
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle cascading failures with circuit breaker', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000
      }, 'test-service');

      const failingService = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // First two failures should reach the service
      await expect(circuitBreaker.execute(failingService)).rejects.toThrow('Service unavailable');
      await expect(circuitBreaker.execute(failingService)).rejects.toThrow('Service unavailable');
      
      // Third request should be blocked by circuit breaker
      await expect(circuitBreaker.execute(failingService)).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(failingService).toHaveBeenCalledTimes(2);
    });
  });

  describe('External Service Integration Failures', () => {
    it('should handle Twitter API failures with retry and fallback', async () => {
      const twitterApiCall = vi.fn()
        .mockRejectedValueOnce(new ExternalServiceError('Twitter API', new Error('Rate limit exceeded')))
        .mockRejectedValueOnce(new ExternalServiceError('Twitter API', new Error('Temporary failure')))
        .mockResolvedValue({ tweets: ['fallback tweet'] });

      const result = await withRetry(
        twitterApiCall,
        {
          maxAttempts: 3,
          baseDelay: 100,
          retryCondition: (error) => error instanceof ExternalServiceError
        },
        'twitter-api-call'
      );

      expect(result).toEqual({ tweets: ['fallback tweet'] });
      expect(twitterApiCall).toHaveBeenCalledTimes(3);
    });

    it('should handle database connection failures with connection pooling', async () => {
      let connectionAttempts = 0;
      const databaseQuery = vi.fn().mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts <= 2) {
          throw new Error('Connection pool exhausted');
        }
        return { data: 'query result' };
      });

      const result = await withRetry(
        databaseQuery,
        {
          maxAttempts: 3,
          baseDelay: 50,
          backoffMultiplier: 1.5
        },
        'database-query'
      );

      expect(result).toEqual({ data: 'query result' });
      expect(connectionAttempts).toBe(3);
    });

    it('should handle sentiment analysis service failures gracefully', async () => {
      const sentimentService = vi.fn()
        .mockRejectedValueOnce(new ExternalServiceError('AWS Comprehend', new Error('Service timeout')))
        .mockRejectedValueOnce(new ExternalServiceError('Google NLP', new Error('Quota exceeded')))
        .mockResolvedValue({ sentiment: 'neutral', confidence: 0.5 }); // Local fallback

      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 2000,
        monitoringPeriod: 10000
      }, 'sentiment-service');

      const result = await withRetry(
        () => circuitBreaker.execute(sentimentService),
        {
          maxAttempts: 3,
          baseDelay: 100
        },
        'sentiment-analysis'
      );

      expect(result).toEqual({ sentiment: 'neutral', confidence: 0.5 });
    });
  });

  describe('System Health Monitoring', () => {
    it('should detect and report system health issues', async () => {
      setupDefaultHealthChecks();
      
      // Mock a failing database health check
      performanceMonitor.registerHealthCheck('database', async () => {
        throw new Error('Database connection timeout');
      });

      const systemHealth = await performanceMonitor.runAllHealthChecks();
      
      expect(systemHealth.overall).toBe('unhealthy');
      
      const dbHealth = systemHealth.services.find(s => s.service === 'database');
      expect(dbHealth?.status).toBe('unhealthy');
      expect(dbHealth?.error).toBe('Database connection timeout');
    });

    it('should handle partial system degradation', async () => {
      performanceMonitor.registerHealthCheck('primary-service', async () => ({
        service: 'primary-service',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 50
      }));

      performanceMonitor.registerHealthCheck('secondary-service', async () => ({
        service: 'secondary-service',
        status: 'degraded' as const,
        timestamp: new Date(),
        responseTime: 200,
        details: { reason: 'High latency detected' }
      }));

      const systemHealth = await performanceMonitor.runAllHealthChecks();
      
      expect(systemHealth.overall).toBe('degraded');
      expect(systemHealth.services).toHaveLength(2);
    });

    it('should trigger alerts for performance degradation', async () => {
      // Add performance alert
      performanceMonitor.addAlert({
        id: 'high-response-time-test',
        name: 'High Response Time Test',
        condition: 'response_time_high',
        threshold: 100,
        severity: 'medium',
        enabled: true,
        channels: ['email'],
        cooldown: 1
      });

      // Record slow metric
      performanceMonitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/slow',
        responseTime: 500, // Exceeds 100ms threshold
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 50,
        activeConnections: 10
      });

      const alert = performanceMonitor.getAlert('high-response-time-test');
      expect(alert?.lastTriggered).toBeDefined();
    });
  });

  describe('Data Processing Pipeline Failures', () => {
    it('should handle batch processing failures with partial success', async () => {
      const batchItems = [
        { id: 1, data: 'valid' },
        { id: 2, data: 'invalid' },
        { id: 3, data: 'valid' },
        { id: 4, data: 'invalid' },
        { id: 5, data: 'valid' }
      ];

      const processItem = vi.fn().mockImplementation((item) => {
        if (item.data === 'invalid') {
          throw new Error(`Invalid data for item ${item.id}`);
        }
        return { ...item, processed: true };
      });

      const results = await Promise.allSettled(
        batchItems.map(item => 
          withRetry(
            () => processItem(item),
            { maxAttempts: 2, baseDelay: 10 },
            `process-item-${item.id}`
          ).catch(error => ({ error: error.message, item }))
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled' && !('error' in r.value));
      const failed = results.filter(r => r.status === 'fulfilled' && ('error' in r.value));

      expect(successful).toHaveLength(3);
      expect(failed).toHaveLength(2);
    });

    it('should handle queue overflow with backpressure', async () => {
      const queue: any[] = [];
      const maxQueueSize = 3;
      
      const addToQueue = (item: any) => {
        if (queue.length >= maxQueueSize) {
          throw new AppError('Queue overflow', 503, 'medium', { queueSize: queue.length });
        }
        queue.push(item);
        return item;
      };

      // Fill queue to capacity
      for (let i = 0; i < maxQueueSize; i++) {
        addToQueue({ id: i });
      }

      // Next item should cause overflow
      expect(() => addToQueue({ id: maxQueueSize })).toThrow('Queue overflow');
    });
  });

  describe('Recovery Scenarios', () => {
    it('should recover from temporary network failures', async () => {
      let networkFailures = 0;
      const networkCall = vi.fn().mockImplementation(() => {
        networkFailures++;
        if (networkFailures <= 2) {
          throw new Error('Network timeout');
        }
        return { data: 'network response' };
      });

      const result = await withRetry(
        networkCall,
        {
          maxAttempts: 3,
          baseDelay: 100,
          backoffMultiplier: 2
        },
        'network-call'
      );

      expect(result).toEqual({ data: 'network response' });
      expect(networkFailures).toBe(3);
    });

    it('should handle memory pressure with graceful degradation', async () => {
      const memoryIntensiveOperation = vi.fn().mockImplementation(() => {
        const memoryUsage = process.memoryUsage().heapUsed;
        const memoryLimit = 100 * 1024 * 1024; // 100MB limit for test
        
        if (memoryUsage > memoryLimit) {
          throw new AppError('Memory pressure detected', 503, 'high', { memoryUsage });
        }
        
        return { result: 'processed', memoryUsage };
      });

      // This would normally trigger memory pressure handling
      const result = await memoryIntensiveOperation();
      expect(result).toHaveProperty('result');
    });

    it('should handle concurrent request spikes', async () => {
      const concurrentRequests = 10;
      const requestHandler = vi.fn().mockImplementation(async (requestId: number) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        return { requestId, processed: true };
      });

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        withRetry(
          () => requestHandler(i),
          { maxAttempts: 2, baseDelay: 10 },
          `request-${i}`
        )
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r.processed)).toBe(true);
      expect(requestHandler).toHaveBeenCalledTimes(concurrentRequests);
    });
  });

  describe('Monitoring and Alerting Integration', () => {
    it('should correlate errors across multiple services', async () => {
      const correlationId = 'test-correlation-123';
      
      // Simulate errors in multiple services with same correlation ID
      const serviceA = vi.fn().mockRejectedValue(new AppError('Service A failed', 500, 'high', { correlationId }));
      const serviceB = vi.fn().mockRejectedValue(new AppError('Service B failed', 500, 'high', { correlationId }));
      
      const errors: Error[] = [];
      
      try {
        await serviceA();
      } catch (error) {
        errors.push(error as Error);
      }
      
      try {
        await serviceB();
      } catch (error) {
        errors.push(error as Error);
      }

      expect(errors).toHaveLength(2);
      expect(errors.every(e => e instanceof AppError && e.context.correlationId === correlationId)).toBe(true);
    });

    it('should track error patterns and trends', async () => {
      const errorTypes = ['ValidationError', 'AuthenticationError', 'ExternalServiceError'];
      
      // Generate various error types
      for (let i = 0; i < 10; i++) {
        const errorType = errorTypes[i % errorTypes.length];
        const error = new AppError(`${errorType} ${i}`, 400 + (i % 3) * 100, 'medium');
        
        performanceMonitor.recordMetric({
          service: 'test-service',
          endpoint: '/api/test',
          responseTime: 100 + i * 10,
          timestamp: new Date(Date.now() + i * 1000),
          statusCode: error.statusCode,
          memoryUsage: 1024 * 1024,
          cpuUsage: 20,
          activeConnections: 3
        });
      }

      const errorRate = performanceMonitor.getErrorRate('test-service');
      expect(errorRate).toBeGreaterThan(0);
      
      const avgResponseTime = performanceMonitor.getAverageResponseTime('test-service');
      expect(avgResponseTime).toBeGreaterThan(100);
    });
  });
});