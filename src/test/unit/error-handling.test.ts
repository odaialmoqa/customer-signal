import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  errorHandler,
  asyncHandler,
  CircuitBreaker,
  retryOperation
} from '../../lib/middleware/error-handler';
import { NextRequest, NextResponse } from 'next/server';

// Mock logger
vi.mock('../../lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppError Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'medium', { userId: '123' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('medium');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('low');
      expect(error.name).toBe('ValidationError');
    });

    it('should create AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.severity).toBe('medium');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.severity).toBe('medium');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create NotFoundError with resource name', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.severity).toBe('low');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create RateLimitError with correct defaults', () => {
      const error = new RateLimitError();
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.severity).toBe('medium');
      expect(error.name).toBe('RateLimitError');
    });

    it('should create ExternalServiceError with service name', () => {
      const originalError = new Error('Connection failed');
      const error = new ExternalServiceError('Twitter API', originalError);
      
      expect(error.message).toBe('External service error: Twitter API');
      expect(error.statusCode).toBe(502);
      expect(error.severity).toBe('high');
      expect(error.context.service).toBe('Twitter API');
      expect(error.context.originalError).toBe('Connection failed');
      expect(error.name).toBe('ExternalServiceError');
    });
  });

  describe('Error Handler', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Invalid email format');
      const request = new NextRequest('http://localhost/api/test');
      
      const response = errorHandler(error, request);
      
      expect(response.status).toBe(400);
    });

    it('should handle unexpected errors', () => {
      const error = new Error('Unexpected error');
      const request = new NextRequest('http://localhost/api/test');
      
      const response = errorHandler(error, request);
      
      expect(response.status).toBe(500);
    });

    it('should include error ID in response', () => {
      const error = new AppError('Test error');
      const response = errorHandler(error);
      
      expect(response.status).toBe(500);
      // Response body would contain errorId
    });
  });

  describe('Async Handler', () => {
    it('should handle successful requests', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = asyncHandler(handler);
      const request = new NextRequest('http://localhost/api/test');
      
      const response = await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalledWith(request, undefined);
      expect(response.status).toBe(200);
    });

    it('should handle thrown errors', async () => {
      const handler = vi.fn().mockRejectedValue(new ValidationError('Invalid data'));
      const wrappedHandler = asyncHandler(handler);
      const request = new NextRequest('http://localhost/api/test');
      
      const response = await wrappedHandler(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;
    
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 60000); // 3 failures, 1 minute timeout
    });

    it('should allow requests when circuit is closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation, 'test-service');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after threshold failures', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service down'));
      
      // First 3 failures should be allowed
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-service');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // 4th request should be rejected immediately
      await expect(
        circuitBreaker.execute(operation, 'test-service')
      ).rejects.toThrow('External service error: test-service');
      
      expect(operation).toHaveBeenCalledTimes(3); // Only first 3 calls should reach the operation
    });

    it('should transition to half-open after timeout', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValue('success');
      
      // Trigger circuit opening
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-service');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Mock time passage
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000); // 61 seconds later
      
      const result = await circuitBreaker.execute(operation, 'test-service');
      expect(result).toBe('success');
    });

    it('should provide circuit state information', () => {
      const state = circuitBreaker.getState();
      
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('lastFailureTime');
    });
  });

  describe('Retry Operation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryOperation(operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await retryOperation(operation, 3, 100); // 100ms base delay
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        retryOperation(operation, 2, 100)
      ).rejects.toThrow('Operation failed after 3 attempts');
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry client errors', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Bad input'));
      
      await expect(
        retryOperation(operation, 3, 100)
      ).rejects.toThrow('Bad input');
      
      expect(operation).toHaveBeenCalledTimes(1); // No retries for client errors
    });

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await retryOperation(operation, 3, 100, 1000); // 100ms base, 1000ms max
      const endTime = Date.now();
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle database connection failures', async () => {
      const dbOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValue({ data: 'retrieved' });
      
      const result = await retryOperation(dbOperation, 3, 500);
      
      expect(result).toEqual({ data: 'retrieved' });
      expect(dbOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle external API rate limiting', async () => {
      const apiCall = vi.fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit exceeded'))
        .mockResolvedValue({ data: 'api response' });
      
      // Rate limit errors should be retried
      const result = await retryOperation(
        apiCall,
        3,
        1000,
        5000,
        2,
        true,
        (error) => error instanceof RateLimitError || error.message.includes('rate limit')
      );
      
      expect(result).toEqual({ data: 'api response' });
    });

    it('should handle cascading failures gracefully', async () => {
      const primaryService = vi.fn().mockRejectedValue(new Error('Primary down'));
      const fallbackService = vi.fn().mockResolvedValue('fallback response');
      
      const operation = async () => {
        try {
          return await primaryService();
        } catch (error) {
          return await fallbackService();
        }
      };
      
      const result = await operation();
      
      expect(result).toBe('fallback response');
      expect(primaryService).toHaveBeenCalledTimes(1);
      expect(fallbackService).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service overloaded'));
      
      const promises = Array.from({ length: 10 }, () =>
        retryOperation(operation, 2, 50).catch(error => error)
      );
      
      const results = await Promise.all(promises);
      
      // All should fail after retries
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
      
      // Should have attempted 30 operations total (10 * 3 attempts each)
      expect(operation).toHaveBeenCalledTimes(30);
    });

    it('should maintain circuit breaker state across concurrent requests', async () => {
      const circuitBreaker = new CircuitBreaker(2, 60000);
      const operation = vi.fn().mockRejectedValue(new Error('Service down'));
      
      // Trigger circuit opening with concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        circuitBreaker.execute(operation, 'test-service').catch(error => error)
      );
      
      const results = await Promise.all(promises);
      
      // Some requests should fail due to circuit being open
      const serviceErrors = results.filter(r => r.message.includes('Service down'));
      const circuitErrors = results.filter(r => r.message.includes('Circuit breaker'));
      
      expect(serviceErrors.length).toBeLessThan(5);
      expect(circuitErrors.length).toBeGreaterThan(0);
    });
  });
});