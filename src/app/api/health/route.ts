import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '../../../lib/services/monitoring';
import { serverLogger as logger } from '../../../lib/utils/logger-server';
import { asyncHandler } from '../../../lib/middleware/error-handler';

export const GET = asyncHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    const systemHealth = await performanceMonitor.runAllHealthChecks();
    const responseTime = Date.now() - startTime;
    
    logger.info('Health check completed', {
      overall: systemHealth.overall,
      responseTime,
      servicesChecked: systemHealth.services.length
    });

    const statusCode = systemHealth.overall === 'healthy' ? 200 : 
                      systemHealth.overall === 'degraded' ? 200 : 503;

    return NextResponse.json({
      status: systemHealth.overall,
      timestamp: systemHealth.timestamp,
      uptime: systemHealth.uptime,
      version: systemHealth.version,
      responseTime,
      services: systemHealth.services.map(service => ({
        name: service.service,
        status: service.status,
        responseTime: service.responseTime,
        ...(service.error && { error: service.error }),
        ...(service.details && { details: service.details })
      }))
    }, { status: statusCode });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    });

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date(),
      responseTime,
      error: 'Health check system failure'
    }, { status: 503 });
  }
});

// Detailed health check for specific service
export const POST = asyncHandler(async (request: NextRequest) => {
  const { service } = await request.json();
  
  if (!service) {
    return NextResponse.json({
      error: 'Service name is required'
    }, { status: 400 });
  }

  const startTime = Date.now();
  
  try {
    const result = await performanceMonitor.runHealthCheck(service);
    const responseTime = Date.now() - startTime;
    
    logger.info('Individual health check completed', {
      service,
      status: result.status,
      responseTime: result.responseTime
    });

    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;

    return NextResponse.json({
      service: result.service,
      status: result.status,
      timestamp: result.timestamp,
      responseTime: result.responseTime,
      ...(result.error && { error: result.error }),
      ...(result.details && { details: result.details })
    }, { status: statusCode });

  } catch (error) {
    logger.error('Individual health check failed', {
      service,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      service,
      status: 'unhealthy',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 503 });
  }
});