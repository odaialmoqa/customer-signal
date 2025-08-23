import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from './logger';

interface ConnectionPoolConfig extends PoolConfig {
  maxConnections?: number;
  minConnections?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  propagateCreateError?: boolean;
}

export class ConnectionPool {
  private pool: Pool;
  private config: ConnectionPoolConfig;
  private metrics: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
    totalQueries: number;
    errorCount: number;
    averageQueryTime: number;
  };

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      max: config.maxConnections || 20,
      min: config.minConnections || 5,
      acquireTimeoutMillis: config.acquireTimeoutMillis || 60000,
      createTimeoutMillis: config.createTimeoutMillis || 30000,
      destroyTimeoutMillis: config.destroyTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 300000, // 5 minutes
      reapIntervalMillis: config.reapIntervalMillis || 1000,
      createRetryIntervalMillis: config.createRetryIntervalMillis || 200,
      propagateCreateError: config.propagateCreateError || false,
      ...config,
    };

    this.pool = new Pool(this.config);
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      errorCount: 0,
      averageQueryTime: 0,
    };

    this.setupEventHandlers();
    this.startMetricsCollection();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      this.metrics.totalConnections++;
      logger.debug('New client connected to pool');
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('release', (client: PoolClient) => {
      logger.debug('Client released back to pool');
    });

    this.pool.on('remove', (client: PoolClient) => {
      this.metrics.totalConnections--;
      logger.debug('Client removed from pool');
    });

    this.pool.on('error', (error: Error, client: PoolClient) => {
      this.metrics.errorCount++;
      logger.error('Pool error:', error);
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update metrics every 10 seconds
  }

  private updateMetrics(): void {
    this.metrics.totalConnections = this.pool.totalCount;
    this.metrics.idleConnections = this.pool.idleCount;
    this.metrics.waitingClients = this.pool.waitingCount;

    logger.debug('Pool metrics:', this.metrics);
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      const result = await client.query(text, params);
      
      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(queryTime);
      
      return result.rows;
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Query error:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.metrics.errorCount++;
      logger.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async batchQuery<T = any>(
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<T[][]> {
    return this.transaction(async (client) => {
      const results: T[][] = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result.rows);
      }
      
      return results;
    });
  }

  private updateQueryMetrics(queryTime: number): void {
    this.metrics.totalQueries++;
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + queryTime) / 
      this.metrics.totalQueries;
  }

  getMetrics() {
    return {
      ...this.metrics,
      poolSize: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
    logger.info('Connection pool closed');
  }

  // Resource monitoring and management
  async optimizePool(): Promise<void> {
    const metrics = this.getMetrics();
    
    // If we have too many idle connections, consider reducing pool size
    if (metrics.idleConnections > metrics.totalConnections * 0.7) {
      logger.info('High idle connection ratio detected, consider reducing pool size');
    }
    
    // If we have many waiting clients, consider increasing pool size
    if (metrics.waitingClients > 5) {
      logger.warn('High waiting client count detected, consider increasing pool size');
    }
    
    // If average query time is high, investigate slow queries
    if (metrics.averageQueryTime > 1000) {
      logger.warn(`High average query time: ${metrics.averageQueryTime}ms`);
    }
  }
}

// Resource manager for multiple pools
export class ResourceManager {
  private pools: Map<string, ConnectionPool> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  addPool(name: string, config: ConnectionPoolConfig): void {
    const pool = new ConnectionPool(config);
    this.pools.set(name, pool);
    
    if (!this.monitoringInterval) {
      this.startMonitoring();
    }
  }

  getPool(name: string): ConnectionPool | undefined {
    return this.pools.get(name);
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      for (const [name, pool] of this.pools) {
        try {
          await pool.optimizePool();
          const metrics = pool.getMetrics();
          
          // Log metrics for monitoring systems
          logger.info(`Pool ${name} metrics:`, metrics);
          
          // Alert on high error rates
          if (metrics.errorCount > 10) {
            logger.error(`High error count in pool ${name}: ${metrics.errorCount}`);
          }
        } catch (error) {
          logger.error(`Error monitoring pool ${name}:`, error);
        }
      }
    }, 60000); // Monitor every minute
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, pool] of this.pools) {
      results[name] = await pool.healthCheck();
    }
    
    return results;
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    const shutdownPromises = Array.from(this.pools.values()).map(pool => pool.end());
    await Promise.all(shutdownPromises);
    
    logger.info('All connection pools shut down');
  }

  getGlobalMetrics() {
    const globalMetrics = {
      totalPools: this.pools.size,
      totalConnections: 0,
      totalQueries: 0,
      totalErrors: 0,
      averageQueryTime: 0,
    };

    let totalQueryTime = 0;
    let totalQueries = 0;

    for (const pool of this.pools.values()) {
      const metrics = pool.getMetrics();
      globalMetrics.totalConnections += metrics.totalConnections;
      globalMetrics.totalQueries += metrics.totalQueries;
      globalMetrics.totalErrors += metrics.errorCount;
      totalQueryTime += metrics.averageQueryTime * metrics.totalQueries;
      totalQueries += metrics.totalQueries;
    }

    if (totalQueries > 0) {
      globalMetrics.averageQueryTime = totalQueryTime / totalQueries;
    }

    return globalMetrics;
  }
}

// Singleton instances
let resourceManager: ResourceManager | null = null;

export function getResourceManager(): ResourceManager {
  if (!resourceManager) {
    resourceManager = new ResourceManager();
  }
  return resourceManager;
}

// Initialize default pools
export function initializeDefaultPools(): void {
  const manager = getResourceManager();
  
  // Main database pool
  manager.addPool('main', {
    connectionString: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_POOL_MAX || '20'),
    minConnections: parseInt(process.env.DB_POOL_MIN || '5'),
    idleTimeoutMillis: 300000, // 5 minutes
    acquireTimeoutMillis: 60000, // 1 minute
  });
  
  // Read replica pool (if available)
  if (process.env.DATABASE_READ_URL) {
    manager.addPool('read', {
      connectionString: process.env.DATABASE_READ_URL,
      maxConnections: parseInt(process.env.DB_READ_POOL_MAX || '15'),
      minConnections: parseInt(process.env.DB_READ_POOL_MIN || '3'),
      idleTimeoutMillis: 300000,
      acquireTimeoutMillis: 60000,
    });
  }
}

export default ConnectionPool;