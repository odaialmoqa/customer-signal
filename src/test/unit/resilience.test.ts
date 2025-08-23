import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  withFallback,
  GracefulDegradation
} from '../../lib/utils/resilience';
import { AppError } from '../../lib/middleware/error-handler';

// Mock logger
vi.mock('../../lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Resilience Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Retry Mechanism', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10 // Short delay for testing
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        withRetry(operation, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('Operation \'operation\' failed after 2 attempts');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry when retry condition returns false', async () => {
      const operation = vi.fn().mockRejectedValue(new AppError('Client error', 400));
      
      await expect(
        withRetry(operation, {
          maxAttempts: 3,
          retryCondition: (error) => !(error instanceof AppError && error.statusCode < 500)
        })
      ).rejects.toThrow('Client error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false
      });
      const endTime = Date.now();
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });

    it('should apply jitter to delays', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');
      
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 1); // Speed up test
      });
      
      await withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 1000,
        jitter: true
      });
      
      // Jitter should make delay between 500-1000ms
      expect(delays[0]).toBeGreaterThan(500);
      expect(delays[0]).toBeLessThan(1000);
      
      vi.restoreAllMocks();
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;
    
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000
      }, 'test-breaker');
    });

    it('should allow requests when circuit is closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service down'));
      
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Next request should be rejected immediately
      await expect(
        circuitBreaker.execute(operation)
      ).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should transition to half-open after recovery timeout', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Fail'))
        .mockRejectedValue(new Error('Fail'))
        .mockRejectedValue(new Error('Fail'))
        .mockResolvedValue('recovered');
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected
        }
      }
      
      // Mock time passage
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
      
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('recovered');
    });

    it('should close circuit after successful recovery', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Fail'))
        .mockRejectedValue(new Error('Fail'))
        .mockRejectedValue(new Error('Fail'))
        .mockResolvedValue('success1')
        .mockResolvedValue('success2')
        .mockResolvedValue('success3');
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected
        }
      }
      
      // Mock time passage to enter half-open
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
      
      // Successful requests should close the circuit
      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
    });

    it('should not trigger on expected errors', async () => {
      const circuitBreakerWithExpected = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000,
        expectedErrors: (error) => error.message === 'Expected error'
      }, 'test-expected');
      
      const operation = vi.fn().mockRejectedValue(new Error('Expected error'));
      
      // These failures shouldn't open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerWithExpected.execute(operation);
        } catch (error) {
          // Expected
        }
      }
      
      const state = circuitBreakerWithExpected.getState();
      expect(state.state).toBe('CLOSED');
    });

    it('should provide accurate state information', () => {
      const state = circuitBreaker.getState();
      
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('successCount');
      expect(state).toHaveProperty('requestCount');
      expect(state).toHaveProperty('lastFailureTime');
    });

    it('should reset circuit breaker state', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected
        }
      }
      
      circuitBreaker.reset();
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
    });
  });

  describe('Bulkhead', () => {
    let bulkhead: Bulkhead;
    
    beforeEach(() => {
      bulkhead = new Bulkhead({
        maxConcurrent: 2,
        maxQueue: 3,
        timeout: 1000
      }, 'test-bulkhead');
    });

    it('should execute operations within concurrency limit', async () => {
      const operation1 = vi.fn().mockResolvedValue('result1');
      const operation2 = vi.fn().mockResolvedValue('result2');
      
      const [result1, result2] = await Promise.all([
        bulkhead.execute(operation1),
        bulkhead.execute(operation2)
      ]);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should queue operations when at concurrency limit', async () => {
      let resolveOp1: (value: string) => void;
      let resolveOp2: (value: string) => void;
      
      const operation1 = vi.fn(() => new Promise<string>(resolve => { resolveOp1 = resolve; }));
      const operation2 = vi.fn(() => new Promise<string>(resolve => { resolveOp2 = resolve; }));
      const operation3 = vi.fn().mockResolvedValue('result3');
      
      const promise1 = bulkhead.execute(operation1);
      const promise2 = bulkhead.execute(operation2);
      const promise3 = bulkhead.execute(operation3); // Should be queued
      
      // First two should start immediately
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
      expect(operation3).not.toHaveBeenCalled();
      
      // Complete first operation
      resolveOp1!('result1');
      await promise1;
      
      // Third operation should now start
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(operation3).toHaveBeenCalled();
      
      // Complete remaining operations
      resolveOp2!('result2');
      await Promise.all([promise2, promise3]);
    });

    it('should reject operations when queue is full', async () => {
      const longRunningOp = () => new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fill concurrency slots
      const promise1 = bulkhead.execute(longRunningOp);
      const promise2 = bulkhead.execute(longRunningOp);
      
      // Fill queue
      const promise3 = bulkhead.execute(longRunningOp);
      const promise4 = bulkhead.execute(longRunningOp);
      const promise5 = bulkhead.execute(longRunningOp);
      
      // This should be rejected
      await expect(
        bulkhead.execute(longRunningOp)
      ).rejects.toThrow('Bulkhead queue full');
      
      // Cleanup
      await Promise.allSettled([promise1, promise2, promise3, promise4, promise5]);
    });

    it('should timeout operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000));
      
      await expect(
        bulkhead.execute(slowOperation)
      ).rejects.toThrow('Bulkhead timeout');
    });

    it('should provide accurate stats', async () => {
      let resolveOp: (value: string) => void;
      const operation = () => new Promise<string>(resolve => { resolveOp = resolve; });
      
      const promise1 = bulkhead.execute(operation);
      const promise2 = bulkhead.execute(operation);
      const promise3 = bulkhead.execute(operation); // Queued
      
      const stats = bulkhead.getStats();
      expect(stats.activeRequests).toBe(2);
      expect(stats.queueSize).toBe(1);
      expect(stats.maxConcurrent).toBe(2);
      expect(stats.maxQueue).toBe(3);
      
      // Cleanup
      resolveOp!('done');
      await Promise.allSettled([promise1, promise2, promise3]);
    });
  });

  describe('Timeout Wrapper', () => {
    it('should complete operation within timeout', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withTimeout(operation, 1000, 'test-op');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should timeout slow operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000));
      
      await expect(
        withTimeout(slowOperation, 100, 'slow-op')
      ).rejects.toThrow('Operation \'slow-op\' timed out after 100ms');
    });
  });

  describe('Fallback Mechanism', () => {
    it('should use primary operation when successful', async () => {
      const primary = vi.fn().mockResolvedValue('primary result');
      const fallback = vi.fn().mockResolvedValue('fallback result');
      
      const result = await withFallback(primary, fallback, 'test-op');
      
      expect(result).toBe('primary result');
      expect(primary).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primary = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = vi.fn().mockResolvedValue('fallback result');
      
      const result = await withFallback(primary, fallback, 'test-op');
      
      expect(result).toBe('fallback result');
      expect(primary).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should throw primary error when both fail', async () => {
      const primaryError = new Error('Primary failed');
      const primary = vi.fn().mockRejectedValue(primaryError);
      const fallback = vi.fn().mockRejectedValue(new Error('Fallback failed'));
      
      await expect(
        withFallback(primary, fallback, 'test-op')
      ).rejects.toThrow('Primary failed');
      
      expect(primary).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('Graceful Degradation', () => {
    let degradation: GracefulDegradation;
    
    beforeEach(() => {
      degradation = new GracefulDegradation();
    });

    it('should execute operation when feature is enabled', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await degradation.executeWithDegradation('test-feature', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should use fallback when feature is disabled', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const fallback = vi.fn().mockReturnValue('fallback result');
      
      degradation.setFeatureStatus('test-feature', false);
      degradation.setFallback('test-feature', fallback);
      
      const result = await degradation.executeWithDegradation('test-feature', operation);
      
      expect(result).toBe('fallback result');
      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should use fallback when operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const fallback = vi.fn().mockReturnValue('fallback result');
      
      degradation.setFallback('test-feature', fallback);
      
      const result = await degradation.executeWithDegradation('test-feature', operation);
      
      expect(result).toBe('fallback result');
      expect(operation).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should throw error when feature is disabled and no fallback', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      degradation.setFeatureStatus('test-feature', false);
      
      await expect(
        degradation.executeWithDegradation('test-feature', operation)
      ).rejects.toThrow('Feature \'test-feature\' is disabled and no fallback is available');
    });

    it('should check feature status', () => {
      expect(degradation.isFeatureEnabled('new-feature')).toBe(true); // Default enabled
      
      degradation.setFeatureStatus('new-feature', false);
      expect(degradation.isFeatureEnabled('new-feature')).toBe(false);
    });

    it('should return all feature statuses', () => {
      degradation.setFeatureStatus('feature1', true);
      degradation.setFeatureStatus('feature2', false);
      
      const features = degradation.getAllFeatures();
      expect(features).toEqual({
        feature1: true,
        feature2: false
      });
    });
  });
});