import { setupDefaultHealthChecks, setupDefaultAlerts, performanceMonitor } from '../services/monitoring';
import { serverLogger as logger } from '../utils/logger-server';
import { gracefulDegradation } from '../utils/resilience';

export function initializeMonitoring(): void {
  try {
    logger.info('Initializing monitoring system...');

    // Setup default health checks
    setupDefaultHealthChecks();
    logger.info('Default health checks registered');

    // Setup default alerts
    setupDefaultAlerts();
    logger.info('Default alerts configured');

    // Setup graceful degradation for key features
    setupGracefulDegradation();
    logger.info('Graceful degradation configured');

    // Setup periodic cleanup
    setupPeriodicCleanup();
    logger.info('Periodic cleanup scheduled');

    logger.info('Monitoring system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize monitoring system', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

function setupGracefulDegradation(): void {
  // Configure fallbacks for key features
  gracefulDegradation.setFallback('sentiment-analysis', () => ({
    sentiment: 'neutral',
    confidence: 0.5,
    source: 'fallback'
  }));

  gracefulDegradation.setFallback('external-monitoring', () => ({
    conversations: [],
    source: 'cache',
    message: 'Using cached data due to external service unavailability'
  }));

  gracefulDegradation.setFallback('real-time-alerts', () => {
    logger.warn('Real-time alerts disabled, using batch processing');
    return { alertsDisabled: true, fallbackMode: 'batch' };
  });

  gracefulDegradation.setFallback('advanced-analytics', () => ({
    basicMetrics: true,
    advancedFeatures: false,
    message: 'Advanced analytics temporarily unavailable'
  }));
}

function setupPeriodicCleanup(): void {
  // Clean up old metrics every hour
  setInterval(() => {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      performanceMonitor.clearMetrics(oneWeekAgo);
      logger.debug('Cleaned up old performance metrics');
    } catch (error) {
      logger.error('Failed to clean up metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, 60 * 60 * 1000); // 1 hour

  // Log system health every 5 minutes
  setInterval(async () => {
    try {
      const systemHealth = await performanceMonitor.runAllHealthChecks();
      logger.info('System health check', {
        overall: systemHealth.overall,
        uptime: systemHealth.uptime,
        servicesCount: systemHealth.services.length,
        unhealthyServices: systemHealth.services.filter(s => s.status === 'unhealthy').length
      });
    } catch (error) {
      logger.error('Failed to run periodic health check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Graceful shutdown handling
export function shutdownMonitoring(): void {
  logger.info('Shutting down monitoring system...');
  
  try {
    // Flush any remaining logs
    logger.destroy();
    
    // Clear intervals would be handled by process termination
    logger.info('Monitoring system shutdown complete');
  } catch (error) {
    console.error('Error during monitoring shutdown:', error);
  }
}

// Handle process signals
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down monitoring...');
    shutdownMonitoring();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down monitoring...');
    shutdownMonitoring();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
      severity: 'critical'
    });
    
    // Give time for logs to flush before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: String(promise),
      severity: 'critical'
    });
  });
}