export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  errorId?: string;
  userId?: string;
  tenantId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  timestamp?: string;
  stack?: string;
  service?: string;
  operation?: string;
  originalError?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  additionalData?: Record<string, any>;
  [key: string]: any;
}

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  averageResponseTime: number;
  lastError: Date;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: ErrorSeverity;
  enabled: boolean;
  channels: string[];
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface PerformanceMetrics {
  service: string;
  endpoint?: string;
  responseTime: number;
  timestamp: Date;
  statusCode: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context: ErrorContext;
  service: string;
  correlationId?: string;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private metrics: Map<string, ErrorMetrics> = new Map();

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  reportError(error: Error, context: ErrorContext): void {
    const serviceName = context.service || 'unknown';
    const errorType = error.constructor.name;
    
    const currentMetrics = this.metrics.get(serviceName) || {
      errorCount: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastError: new Date(),
      errorsByType: {},
      errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    currentMetrics.errorCount++;
    currentMetrics.lastError = new Date();
    currentMetrics.errorsByType[errorType] = (currentMetrics.errorsByType[errorType] || 0) + 1;
    
    if (context.severity) {
      currentMetrics.errorsBySeverity[context.severity as ErrorSeverity]++;
    }

    this.metrics.set(serviceName, currentMetrics);
  }

  getMetrics(service?: string): ErrorMetrics | Map<string, ErrorMetrics> {
    if (service) {
      return this.metrics.get(service) || {
        errorCount: 0,
        errorRate: 0,
        averageResponseTime: 0,
        lastError: new Date(),
        errorsByType: {},
        errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
      };
    }
    return this.metrics;
  }

  resetMetrics(service?: string): void {
    if (service) {
      this.metrics.delete(service);
    } else {
      this.metrics.clear();
    }
  }
}