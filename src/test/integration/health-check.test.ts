import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor, setupDefaultHealthChecks } from '../../lib/services/monitoring';

describe('Health Check Integration', () => {
  beforeEach(() => {
    // Clear any existing health checks
    performanceMonitor['healthChecks'].clear();
  });

  it('should setup and run default health checks', async () => {
    setupDefaultHealthChecks();
    
    const systemHealth = await performanceMonitor.runAllHealthChecks();
    
    expect(systemHealth).toBeDefined();
    expect(systemHealth.overall).toMatch(/healthy|degraded|unhealthy/);
    expect(systemHealth.services).toBeInstanceOf(Array);
    expect(systemHealth.services.length).toBeGreaterThan(0);
    expect(systemHealth.timestamp).toBeInstanceOf(Date);
    expect(systemHealth.version).toBeDefined();
  });

  it('should handle individual health check failures gracefully', async () => {
    performanceMonitor.registerHealthCheck('failing-service', async () => {
      throw new Error('Service is down');
    });

    const result = await performanceMonitor.runHealthCheck('failing-service');
    
    expect(result.service).toBe('failing-service');
    expect(result.status).toBe('unhealthy');
    expect(result.error).toBe('Service is down');
    expect(result.responseTime).toBeGreaterThan(0);
  });

  it('should determine overall system health correctly', async () => {
    // Register healthy service
    performanceMonitor.registerHealthCheck('healthy-service', async () => ({
      service: 'healthy-service',
      status: 'healthy' as const,
      timestamp: new Date(),
      responseTime: 50
    }));

    // Register degraded service
    performanceMonitor.registerHealthCheck('degraded-service', async () => ({
      service: 'degraded-service',
      status: 'degraded' as const,
      timestamp: new Date(),
      responseTime: 200
    }));

    const systemHealth = await performanceMonitor.runAllHealthChecks();
    
    expect(systemHealth.overall).toBe('degraded');
    expect(systemHealth.services).toHaveLength(2);
    
    const healthyService = systemHealth.services.find(s => s.service === 'healthy-service');
    const degradedService = systemHealth.services.find(s => s.service === 'degraded-service');
    
    expect(healthyService?.status).toBe('healthy');
    expect(degradedService?.status).toBe('degraded');
  });

  it('should measure health check response times', async () => {
    performanceMonitor.registerHealthCheck('slow-service', async () => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        service: 'slow-service',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 0 // Will be overwritten by actual measurement
      };
    });

    const result = await performanceMonitor.runHealthCheck('slow-service');
    
    expect(result.responseTime).toBeGreaterThan(90);
    expect(result.responseTime).toBeLessThan(200);
  });
});