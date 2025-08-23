import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, setupDefaultHealthChecks, setupDefaultAlerts } from '../../lib/services/monitoring';
import { PerformanceMetrics, AlertConfig, HealthCheckResult } from '../../lib/types/error';

// Mock logger
vi.mock('../../lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logPerformanceMetric: vi.fn()
  }
}));

describe('Performance Monitoring', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    // Clear any existing data
    monitor['metrics'].clear();
    monitor['alerts'].clear();
    monitor['healthChecks'].clear();
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      const metric: PerformanceMetrics = {
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 150,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 25.5,
        activeConnections: 5
      };

      monitor.recordMetric(metric);

      const metrics = monitor.getMetrics('test-service', '/api/test');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it('should limit metrics storage per key', () => {
      const baseMetric: PerformanceMetrics = {
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 100,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      };

      // Add 1001 metrics
      for (let i = 0; i < 1001; i++) {
        monitor.recordMetric({
          ...baseMetric,
          responseTime: 100 + i,
          timestamp: new Date(Date.now() + i)
        });
      }

      const metrics = monitor.getMetrics('test-service', '/api/test');
      expect(metrics).toHaveLength(1000); // Should be limited to 1000
    });

    it('should calculate average response time', () => {
      const metrics = [
        { responseTime: 100 },
        { responseTime: 200 },
        { responseTime: 300 }
      ];

      metrics.forEach((metric, index) => {
        monitor.recordMetric({
          service: 'test-service',
          endpoint: '/api/test',
          responseTime: metric.responseTime,
          timestamp: new Date(Date.now() + index),
          statusCode: 200,
          memoryUsage: 1024 * 1024,
          cpuUsage: 20,
          activeConnections: 3
        });
      });

      const avgResponseTime = monitor.getAverageResponseTime('test-service', '/api/test');
      expect(avgResponseTime).toBe(200);
    });

    it('should calculate error rate', () => {
      const statusCodes = [200, 200, 400, 500, 200];

      statusCodes.forEach((statusCode, index) => {
        monitor.recordMetric({
          service: 'test-service',
          endpoint: '/api/test',
          responseTime: 100,
          timestamp: new Date(Date.now() + index),
          statusCode,
          memoryUsage: 1024 * 1024,
          cpuUsage: 20,
          activeConnections: 3
        });
      });

      const errorRate = monitor.getErrorRate('test-service', '/api/test');
      expect(errorRate).toBe(40); // 2 errors out of 5 requests = 40%
    });

    it('should filter metrics by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Add metrics at different times
      [twoHoursAgo, oneHourAgo, now].forEach((timestamp, index) => {
        monitor.recordMetric({
          service: 'test-service',
          endpoint: '/api/test',
          responseTime: 100 + index,
          timestamp,
          statusCode: 200,
          memoryUsage: 1024 * 1024,
          cpuUsage: 20,
          activeConnections: 3
        });
      });

      const recentMetrics = monitor.getMetrics('test-service', '/api/test', {
        start: oneHourAgo,
        end: now
      });

      expect(recentMetrics).toHaveLength(2);
      expect(recentMetrics.every(m => m.timestamp >= oneHourAgo)).toBe(true);
    });
  });

  describe('Timer Functionality', () => {
    it('should measure operation duration', async () => {
      const stopTimer = monitor.startTimer('test-operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      stopTimer();

      const metrics = monitor.getMetrics('customer-signal', 'test-operation');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].responseTime).toBeGreaterThan(90);
      expect(metrics[0].responseTime).toBeLessThan(200);
    });
  });

  describe('Alert System', () => {
    it('should add and retrieve alerts', () => {
      const alert: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        condition: 'response_time_high',
        threshold: 1000,
        severity: 'medium',
        enabled: true,
        channels: ['email'],
        cooldown: 10
      };

      monitor.addAlert(alert);

      const retrievedAlert = monitor.getAlert('test-alert');
      expect(retrievedAlert).toEqual(alert);
    });

    it('should trigger alert when threshold is exceeded', () => {
      const alert: AlertConfig = {
        id: 'high-response-time',
        name: 'High Response Time',
        condition: 'response_time_high',
        threshold: 500,
        severity: 'medium',
        enabled: true,
        channels: ['email'],
        cooldown: 5
      };

      monitor.addAlert(alert);

      // Record metric that exceeds threshold
      monitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/slow',
        responseTime: 1000, // Exceeds 500ms threshold
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      });

      // Alert should have been triggered (lastTriggered should be set)
      const triggeredAlert = monitor.getAlert('high-response-time');
      expect(triggeredAlert?.lastTriggered).toBeDefined();
    });

    it('should respect alert cooldown period', () => {
      const alert: AlertConfig = {
        id: 'test-cooldown',
        name: 'Test Cooldown',
        condition: 'response_time_high',
        threshold: 100,
        severity: 'low',
        enabled: true,
        channels: ['email'],
        cooldown: 60 // 60 minutes
      };

      monitor.addAlert(alert);

      // Trigger alert first time
      monitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 200,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      });

      const firstTrigger = monitor.getAlert('test-cooldown')?.lastTriggered;
      expect(firstTrigger).toBeDefined();

      // Trigger alert second time immediately
      monitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 300,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      });

      const secondTrigger = monitor.getAlert('test-cooldown')?.lastTriggered;
      
      // Should be the same time (not triggered again due to cooldown)
      expect(secondTrigger?.getTime()).toBe(firstTrigger?.getTime());
    });

    it('should not trigger disabled alerts', () => {
      const alert: AlertConfig = {
        id: 'disabled-alert',
        name: 'Disabled Alert',
        condition: 'response_time_high',
        threshold: 100,
        severity: 'low',
        enabled: false, // Disabled
        channels: ['email'],
        cooldown: 5
      };

      monitor.addAlert(alert);

      monitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 200, // Exceeds threshold
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      });

      const alertAfter = monitor.getAlert('disabled-alert');
      expect(alertAfter?.lastTriggered).toBeUndefined();
    });
  });

  describe('Health Checks', () => {
    it('should register and run health checks', async () => {
      const healthCheck = vi.fn().mockResolvedValue({
        service: 'test-service',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 50,
        details: { version: '1.0.0' }
      });

      monitor.registerHealthCheck('test-service', healthCheck);

      const result = await monitor.runHealthCheck('test-service');

      expect(healthCheck).toHaveBeenCalled();
      expect(result.service).toBe('test-service');
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should handle health check failures', async () => {
      const healthCheck = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      monitor.registerHealthCheck('failing-service', healthCheck);

      const result = await monitor.runHealthCheck('failing-service');

      expect(result.service).toBe('failing-service');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Service unavailable');
    });

    it('should return error for non-existent health check', async () => {
      const result = await monitor.runHealthCheck('non-existent');

      expect(result.service).toBe('non-existent');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Health check not found');
    });

    it('should run all health checks and determine overall status', async () => {
      monitor.registerHealthCheck('service1', vi.fn().mockResolvedValue({
        service: 'service1',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 50
      }));

      monitor.registerHealthCheck('service2', vi.fn().mockResolvedValue({
        service: 'service2',
        status: 'degraded' as const,
        timestamp: new Date(),
        responseTime: 100
      }));

      monitor.registerHealthCheck('service3', vi.fn().mockRejectedValue(new Error('Down')));

      const systemHealth = await monitor.runAllHealthChecks();

      expect(systemHealth.overall).toBe('unhealthy'); // One service is unhealthy
      expect(systemHealth.services).toHaveLength(3);
      expect(systemHealth.uptime).toBeGreaterThan(0);
      expect(systemHealth.version).toBeDefined();
    });

    it('should determine overall health status correctly', async () => {
      // All healthy
      monitor.registerHealthCheck('service1', vi.fn().mockResolvedValue({
        service: 'service1',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 50
      }));

      let systemHealth = await monitor.runAllHealthChecks();
      expect(systemHealth.overall).toBe('healthy');

      // Clear and add degraded service
      monitor['healthChecks'].clear();
      monitor.registerHealthCheck('service1', vi.fn().mockResolvedValue({
        service: 'service1',
        status: 'degraded' as const,
        timestamp: new Date(),
        responseTime: 50
      }));

      systemHealth = await monitor.runAllHealthChecks();
      expect(systemHealth.overall).toBe('degraded');
    });
  });

  describe('Metrics Cleanup', () => {
    it('should clear all metrics', () => {
      monitor.recordMetric({
        service: 'test-service',
        endpoint: '/api/test',
        responseTime: 100,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: 1024 * 1024,
        cpuUsage: 20,
        activeConnections: 3
      });

      monitor.clearMetrics();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should clear metrics older than specified date', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Add old and new metrics
      [twoHoursAgo, now].forEach((timestamp, index) => {
        monitor.recordMetric({
          service: 'test-service',
          endpoint: '/api/test',
          responseTime: 100 + index,
          timestamp,
          statusCode: 200,
          memoryUsage: 1024 * 1024,
          cpuUsage: 20,
          activeConnections: 3
        });
      });

      monitor.clearMetrics(oneHourAgo);

      const remainingMetrics = monitor.getMetrics('test-service');
      expect(remainingMetrics).toHaveLength(1);
      expect(remainingMetrics[0].timestamp).toEqual(now);
    });
  });

  describe('Default Setup', () => {
    it('should setup default health checks', () => {
      setupDefaultHealthChecks();

      // Should have registered default health checks
      expect(monitor['healthChecks'].has('database')).toBe(true);
      expect(monitor['healthChecks'].has('redis')).toBe(true);
      expect(monitor['healthChecks'].has('external-apis')).toBe(true);
    });

    it('should setup default alerts', () => {
      setupDefaultAlerts();

      const alerts = monitor.getAllAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const responseTimeAlert = alerts.find(a => a.id === 'high-response-time');
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert?.threshold).toBe(5000);
    });
  });
});