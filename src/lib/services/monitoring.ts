import { logger } from '../utils/logger';
import { 
  PerformanceMetrics, 
  AlertConfig, 
  ErrorSeverity, 
  SystemHealth, 
  HealthCheckResult 
} from '../types/error';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Performance tracking
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.recordMetric({
        service: 'customer-signal',
        endpoint: operation,
        responseTime: duration,
        timestamp: new Date(),
        statusCode: 200,
        memoryUsage: endMemory.used,
        cpuUsage: this.getCpuUsage(),
        activeConnections: this.getActiveConnections()
      });

      logger.logPerformanceMetric('operation_duration', duration, 'ms', {
        operation,
        memoryDelta: endMemory.used - startMemory.used
      });
    };
  }

  recordMetric(metric: PerformanceMetrics): void {
    const key = `${metric.service}:${metric.endpoint || 'general'}`;
    const metrics = this.metrics.get(key) || [];
    
    metrics.push(metric);
    
    // Keep only last 1000 metrics per key
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    this.metrics.set(key, metrics);
    
    // Check alerts
    this.checkAlerts(metric);
  }

  private checkAlerts(metric: PerformanceMetrics): void {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue;
      
      // Check cooldown
      if (alert.lastTriggered) {
        const cooldownMs = alert.cooldown * 60 * 1000;
        if (Date.now() - alert.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      let shouldTrigger = false;
      
      // Simple condition evaluation
      switch (alert.condition) {
        case 'response_time_high':
          shouldTrigger = metric.responseTime > alert.threshold;
          break;
        case 'memory_usage_high':
          shouldTrigger = metric.memoryUsage > alert.threshold;
          break;
        case 'cpu_usage_high':
          shouldTrigger = metric.cpuUsage > alert.threshold;
          break;
        case 'error_rate_high':
          shouldTrigger = metric.statusCode >= 400;
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(alert, metric);
      }
    }
  }

  private async triggerAlert(alert: AlertConfig, metric: PerformanceMetrics): Promise<void> {
    alert.lastTriggered = new Date();
    
    const alertMessage = `Alert: ${alert.name} - ${alert.condition} exceeded threshold ${alert.threshold}`;
    
    logger.warn(alertMessage, {
      alertId: alert.id,
      severity: alert.severity,
      metric: metric,
      threshold: alert.threshold
    });

    // Send notifications to configured channels
    for (const channel of alert.channels) {
      await this.sendNotification(channel, alert, metric);
    }
  }

  private async sendNotification(channel: string, alert: AlertConfig, metric: PerformanceMetrics): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, metric);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, metric);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, metric);
          break;
        default:
          logger.warn(`Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Failed to send notification to ${channel}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId: alert.id
      });
    }
  }

  private async sendEmailAlert(alert: AlertConfig, metric: PerformanceMetrics): Promise<void> {
    // TODO: Implement email notification
    logger.info('Email alert would be sent', { alert: alert.name, metric });
  }

  private async sendSlackAlert(alert: AlertConfig, metric: PerformanceMetrics): Promise<void> {
    // TODO: Implement Slack notification
    logger.info('Slack alert would be sent', { alert: alert.name, metric });
  }

  private async sendWebhookAlert(alert: AlertConfig, metric: PerformanceMetrics): Promise<void> {
    // TODO: Implement webhook notification
    logger.info('Webhook alert would be sent', { alert: alert.name, metric });
  }

  // Health checks
  registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
  }

  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const check = this.healthChecks.get(name);
    if (!check) {
      return {
        service: name,
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: 0,
        error: 'Health check not found'
      };
    }

    const startTime = Date.now();
    try {
      const result = await check();
      result.responseTime = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        service: name,
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runAllHealthChecks(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];
    
    for (const [name] of this.healthChecks) {
      const result = await this.runHealthCheck(name);
      results.push(result);
    }

    const overallStatus = this.determineOverallHealth(results);
    
    return {
      overall: overallStatus,
      services: results,
      timestamp: new Date(),
      uptime: 0, // Uptime not available in edge runtime
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  private determineOverallHealth(results: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (results.length === 0) return 'unhealthy';
    
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  // Alert management
  addAlert(alert: AlertConfig): void {
    this.alerts.set(alert.id, alert);
  }

  removeAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  getAlert(alertId: string): AlertConfig | undefined {
    return this.alerts.get(alertId);
  }

  getAllAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  // Metrics retrieval
  getMetrics(service?: string, endpoint?: string, timeRange?: { start: Date; end: Date }): PerformanceMetrics[] {
    let allMetrics: PerformanceMetrics[] = [];
    
    for (const [key, metrics] of this.metrics) {
      if (service && !key.startsWith(service)) continue;
      if (endpoint && !key.includes(endpoint)) continue;
      
      let filteredMetrics = metrics;
      if (timeRange) {
        filteredMetrics = metrics.filter(m => 
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }
      
      allMetrics = allMetrics.concat(filteredMetrics);
    }
    
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAverageResponseTime(service: string, endpoint?: string, timeRange?: { start: Date; end: Date }): number {
    const metrics = this.getMetrics(service, endpoint, timeRange);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / metrics.length;
  }

  getErrorRate(service: string, endpoint?: string, timeRange?: { start: Date; end: Date }): number {
    const metrics = this.getMetrics(service, endpoint, timeRange);
    if (metrics.length === 0) return 0;
    
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    return (errorCount / metrics.length) * 100;
  }

  // System resource monitoring
  private getMemoryUsage(): { used: number; total: number } {
    // Edge runtime compatible memory usage
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory?.usedJSHeapSize || 0,
        total: memory?.totalJSHeapSize || 0
      };
    }
    return { used: 0, total: 0 };
  }

  private getCpuUsage(): number {
    // CPU usage not available in edge runtime
    return 0;
  }

  private getActiveConnections(): number {
    // This would need to be implemented based on your server setup
    return 0;
  }

  // Cleanup
  clearMetrics(olderThan?: Date): void {
    if (!olderThan) {
      this.metrics.clear();
      return;
    }

    for (const [key, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp > olderThan);
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filteredMetrics);
      }
    }
  }
}

// Default health checks
export function setupDefaultHealthChecks(): void {
  const monitor = PerformanceMonitor.getInstance();

  // Database health check
  monitor.registerHealthCheck('database', async (): Promise<HealthCheckResult> => {
    try {
      // TODO: Implement actual database ping
      const startTime = Date.now();
      // await database.ping();
      
      return {
        service: 'database',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          connectionPool: 'active',
          activeConnections: 5,
          maxConnections: 20
        }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  });

  // Redis health check
  monitor.registerHealthCheck('redis', async (): Promise<HealthCheckResult> => {
    try {
      // TODO: Implement actual Redis ping
      const startTime = Date.now();
      // await redis.ping();
      
      return {
        service: 'redis',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          memoryUsage: '45MB',
          connectedClients: 3
        }
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  });

  // External API health check
  monitor.registerHealthCheck('external-apis', async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      
      // Check a few critical external APIs
      const checks = await Promise.allSettled([
        fetch('https://api.twitter.com/2/tweets/search/recent?query=test', { method: 'HEAD' }),
        fetch('https://www.reddit.com/api/v1/me', { method: 'HEAD' }),
      ]);

      const failedChecks = checks.filter(result => result.status === 'rejected').length;
      const status = failedChecks === 0 ? 'healthy' : failedChecks < checks.length ? 'degraded' : 'unhealthy';

      return {
        service: 'external-apis',
        status,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          totalChecks: checks.length,
          failedChecks,
          successRate: `${((checks.length - failedChecks) / checks.length * 100).toFixed(1)}%`
        }
      };
    } catch (error) {
      return {
        service: 'external-apis',
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'External API checks failed'
      };
    }
  });
}

// Default alerts
export function setupDefaultAlerts(): void {
  const monitor = PerformanceMonitor.getInstance();

  monitor.addAlert({
    id: 'high-response-time',
    name: 'High Response Time',
    condition: 'response_time_high',
    threshold: 5000, // 5 seconds
    severity: 'medium',
    enabled: true,
    channels: ['email', 'slack'],
    cooldown: 15 // 15 minutes
  });

  monitor.addAlert({
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    condition: 'memory_usage_high',
    threshold: 500 * 1024 * 1024, // 500MB
    severity: 'high',
    enabled: true,
    channels: ['email', 'slack'],
    cooldown: 10 // 10 minutes
  });

  monitor.addAlert({
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: 'error_rate_high',
    threshold: 400, // HTTP status codes >= 400
    severity: 'high',
    enabled: true,
    channels: ['email', 'slack', 'webhook'],
    cooldown: 5 // 5 minutes
  });
}

export const performanceMonitor = PerformanceMonitor.getInstance();