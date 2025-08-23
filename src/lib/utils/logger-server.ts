// Server-only logger with full Node.js functionality
import { ErrorContext, LogEntry } from '../types/error';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  service: string;
  environment: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxFileSize: number;
  maxFiles: number;
}

class ServerLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      service: process.env.SERVICE_NAME || 'customer-signal',
      environment: process.env.NODE_ENV || 'development',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      remoteEndpoint: process.env.LOG_ENDPOINT,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    };

    // Start periodic flush for remote logging
    if (this.config.enableRemote) {
      this.flushInterval = setInterval(() => this.flushLogs(), 5000);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: ErrorContext = {}
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context: {
        ...context,
        correlationId: context.correlationId || this.generateCorrelationId(),
        environment: this.config.environment
      },
      service: this.config.service,
      correlationId: context.correlationId || this.generateCorrelationId()
    };
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = entry.service.padEnd(15);
    
    const contextStr = Object.keys(entry.context).length > 0 
      ? ` | ${JSON.stringify(entry.context)}` 
      : '';

    return `${timestamp} [${level}] ${service} | ${entry.message}${contextStr}`;
  }

  private writeToConsole(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `${this.config.service}.log`);
      
      // Ensure log directory exists
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const formatted = this.formatLogEntry(entry) + '\n';
      await fs.appendFile(logFile, formatted);
      
      // TODO: Implement log rotation based on maxFileSize and maxFiles
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Prevent buffer from growing too large
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.remoteEndpoint) return;

    try {
      const logs = [...this.logBuffer];
      this.logBuffer = [];

      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOG_API_KEY}`
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to flush logs to remote endpoint:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  private log(level: LogLevel, message: string, context: ErrorContext = {}): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context);

    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    if (this.config.enableFile) {
      this.writeToFile(entry).catch(console.error);
    }

    if (this.config.enableRemote) {
      this.addToBuffer(entry);
    }
  }

  debug(message: string, context: ErrorContext = {}): void {
    this.log('debug', message, context);
  }

  info(message: string, context: ErrorContext = {}): void {
    this.log('info', message, context);
  }

  warn(message: string, context: ErrorContext = {}): void {
    this.log('warn', message, context);
  }

  error(message: string, context: ErrorContext = {}): void {
    this.log('error', message, context);
  }

  // Structured logging methods
  logRequest(method: string, url: string, statusCode: number, responseTime: number, context: ErrorContext = {}): void {
    this.info('HTTP Request', {
      ...context,
      method,
      url,
      statusCode,
      responseTime,
      type: 'http_request'
    });
  }

  logDatabaseQuery(query: string, duration: number, context: ErrorContext = {}): void {
    this.debug('Database Query', {
      ...context,
      query: query.substring(0, 200), // Truncate long queries
      duration,
      type: 'database_query'
    });
  }

  logExternalApiCall(service: string, endpoint: string, statusCode: number, responseTime: number, context: ErrorContext = {}): void {
    this.info('External API Call', {
      ...context,
      service,
      endpoint,
      statusCode,
      responseTime,
      type: 'external_api'
    });
  }

  logBusinessEvent(event: string, data: Record<string, any>, context: ErrorContext = {}): void {
    this.info('Business Event', {
      ...context,
      event,
      data,
      type: 'business_event'
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context: ErrorContext = {}): void {
    this.info('Performance Metric', {
      ...context,
      metric,
      value,
      unit,
      type: 'performance_metric'
    });
  }

  // Cleanup method
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining logs
    if (this.logBuffer.length > 0) {
      this.flushLogs().catch(console.error);
    }
  }
}

// Create singleton instance
export const serverLogger = new ServerLogger();

// Graceful shutdown handling
process.on('SIGINT', () => {
  serverLogger.info('Received SIGINT, flushing logs...');
  serverLogger.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverLogger.info('Received SIGTERM, flushing logs...');
  serverLogger.destroy();
  process.exit(0);
});

export default serverLogger;