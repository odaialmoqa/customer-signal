import { logger } from '../../lib/utils/logger';
import { initializeDefaultPools } from '../../lib/utils/connection-pool';
import { getCacheManager } from '../../lib/utils/cache-manager';

export async function setup() {
  logger.info('Setting up performance test environment');
  
  try {
    // Initialize connection pools with test configuration
    process.env.DB_POOL_MAX = '10';
    process.env.DB_POOL_MIN = '2';
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
    
    initializeDefaultPools();
    
    // Initialize cache manager
    const cacheManager = getCacheManager();
    await cacheManager.healthCheck();
    
    // Warm up the system
    await warmUpSystem();
    
    logger.info('Performance test environment setup complete');
  } catch (error) {
    logger.error('Failed to setup performance test environment:', error);
    throw error;
  }
}

export async function teardown() {
  logger.info('Tearing down performance test environment');
  
  try {
    const { getResourceManager } = await import('../../lib/utils/connection-pool');
    const { getCacheManager } = await import('../../lib/utils/cache-manager');
    
    const resourceManager = getResourceManager();
    const cacheManager = getCacheManager();
    
    await resourceManager.shutdown();
    await cacheManager.disconnect();
    
    logger.info('Performance test environment teardown complete');
  } catch (error) {
    logger.error('Failed to teardown performance test environment:', error);
  }
}

async function warmUpSystem() {
  // Perform some warm-up operations to stabilize the system
  const operations = [];
  
  // Warm up memory allocation
  for (let i = 0; i < 100; i++) {
    operations.push(Promise.resolve(new Array(1000).fill(i)));
  }
  
  // Warm up async operations
  for (let i = 0; i < 50; i++) {
    operations.push(new Promise(resolve => setTimeout(resolve, 1)));
  }
  
  await Promise.all(operations);
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Wait for system to stabilize
  await new Promise(resolve => setTimeout(resolve, 1000));
}