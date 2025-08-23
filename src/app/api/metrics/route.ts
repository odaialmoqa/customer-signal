import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '../../../lib/utils/performance-metrics';
import { getResourceManager } from '../../../lib/utils/connection-pool';
import { getCacheManager } from '../../../lib/utils/cache-manager';
import { logger } from '../../../lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const metrics = getMetrics();
    const resourceManager = getResourceManager();
    const cacheManager = getCacheManager();

    // Collect current system metrics
    metrics.recordMemoryUsage();
    metrics.recordEventLoopLag();

    // Collect database pool metrics
    try {
      const poolMetrics = resourceManager.getGlobalMetrics();
      metrics.setGauge('db_connections_active', poolMetrics.totalConnections);
      metrics.setGauge('db_queries_total', poolMetrics.totalQueries);
      metrics.setGauge('db_errors_total', poolMetrics.totalErrors);
      metrics.setGauge('db_average_query_time_seconds', poolMetrics.averageQueryTime / 1000);
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
    }

    // Collect cache health metrics
    try {
      const cacheHealthy = await cacheManager.healthCheck();
      metrics.setGauge('cache_healthy', cacheHealthy ? 1 : 0);
    } catch (error) {
      logger.error('Error collecting cache metrics:', error);
      metrics.setGauge('cache_healthy', 0);
    }

    // Export metrics in Prometheus format
    const prometheusMetrics = metrics.exportPrometheusMetrics();

    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const resourceManager = getResourceManager();
    const cacheManager = getCacheManager();

    // Check database health
    const dbHealth = await resourceManager.healthCheck();
    const dbHealthy = Object.values(dbHealth).every(healthy => healthy);

    // Check cache health
    const cacheHealthy = await cacheManager.healthCheck();

    if (dbHealthy && cacheHealthy) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    logger.error('Health check failed:', error);
    return new NextResponse(null, { status: 503 });
  }
}