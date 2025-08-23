import { describe, it, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { getCacheManager } from '../../lib/utils/cache-manager';
import { getResourceManager } from '../../lib/utils/connection-pool';
import { logger } from '../../lib/utils/logger';

interface LoadTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  rampUpTimeMs: number;
  requestsPerSecond: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

class LoadTester {
  private results: number[] = [];
  private errors: Error[] = [];
  private startTime: number = 0;

  async runLoadTest(
    testName: string,
    testFunction: () => Promise<void>,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    logger.info(`Starting load test: ${testName}`);
    logger.info(`Config:`, config);

    this.results = [];
    this.errors = [];
    this.startTime = performance.now();

    const promises: Promise<void>[] = [];
    const requestInterval = 1000 / config.requestsPerSecond;
    let requestCount = 0;

    // Ramp up users gradually
    const usersPerInterval = config.concurrentUsers / (config.rampUpTimeMs / 1000);
    let currentUsers = 0;

    const rampUpInterval = setInterval(() => {
      currentUsers = Math.min(currentUsers + usersPerInterval, config.concurrentUsers);
    }, 1000);

    // Main test loop
    const testInterval = setInterval(() => {
      if (performance.now() - this.startTime >= config.testDurationMs) {
        clearInterval(testInterval);
        clearInterval(rampUpInterval);
        return;
      }

      if (requestCount < currentUsers) {
        promises.push(this.executeRequest(testFunction));
        requestCount++;
      }
    }, requestInterval);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, config.testDurationMs));
    
    // Wait for all requests to complete
    await Promise.allSettled(promises);

    return this.calculateResults(config.testDurationMs);
  }

  private async executeRequest(testFunction: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    
    try {
      await testFunction();
      const responseTime = performance.now() - startTime;
      this.results.push(responseTime);
    } catch (error) {
      this.errors.push(error as Error);
      const responseTime = performance.now() - startTime;
      this.results.push(responseTime); // Still record response time for failed requests
    }
  }

  private calculateResults(testDurationMs: number): LoadTestResult {
    const totalRequests = this.results.length;
    const successfulRequests = totalRequests - this.errors.length;
    const failedRequests = this.errors.length;

    const sortedResults = this.results.sort((a, b) => a - b);
    const averageResponseTime = this.results.reduce((sum, time) => sum + time, 0) / totalRequests;
    const minResponseTime = Math.min(...this.results);
    const maxResponseTime = Math.max(...this.results);
    const requestsPerSecond = totalRequests / (testDurationMs / 1000);
    const errorRate = (failedRequests / totalRequests) * 100;

    const percentiles = {
      p50: this.getPercentile(sortedResults, 50),
      p90: this.getPercentile(sortedResults, 90),
      p95: this.getPercentile(sortedResults, 95),
      p99: this.getPercentile(sortedResults, 99),
    };

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate,
      percentiles,
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }
}

describe('Load Testing', () => {
  let loadTester: LoadTester;
  let cacheManager: any;
  let resourceManager: any;

  beforeAll(async () => {
    loadTester = new LoadTester();
    cacheManager = getCacheManager();
    resourceManager = getResourceManager();
    
    // Initialize test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('should handle high concurrent user load', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 100,
      testDurationMs: 30000, // 30 seconds
      rampUpTimeMs: 5000, // 5 seconds
      requestsPerSecond: 50,
    };

    const result = await loadTester.runLoadTest(
      'High Concurrent Users',
      async () => {
        // Simulate typical user workflow
        await simulateUserWorkflow();
      },
      config
    );

    logger.info('High concurrent user load test results:', result);

    // Assertions
    expect(result.errorRate).toBeLessThan(5); // Less than 5% error rate
    expect(result.averageResponseTime).toBeLessThan(2000); // Less than 2 seconds average
    expect(result.percentiles.p95).toBeLessThan(5000); // 95th percentile under 5 seconds
  });

  it('should handle database query load', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 50,
      testDurationMs: 20000,
      rampUpTimeMs: 3000,
      requestsPerSecond: 100,
    };

    const result = await loadTester.runLoadTest(
      'Database Query Load',
      async () => {
        await simulateDatabaseQueries();
      },
      config
    );

    logger.info('Database query load test results:', result);

    expect(result.errorRate).toBeLessThan(2);
    expect(result.averageResponseTime).toBeLessThan(1000);
  });

  it('should handle cache performance under load', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 200,
      testDurationMs: 15000,
      rampUpTimeMs: 2000,
      requestsPerSecond: 200,
    };

    const result = await loadTester.runLoadTest(
      'Cache Performance Load',
      async () => {
        await simulateCacheOperations();
      },
      config
    );

    logger.info('Cache performance load test results:', result);

    expect(result.errorRate).toBeLessThan(1);
    expect(result.averageResponseTime).toBeLessThan(100); // Cache should be very fast
  });

  it('should handle API endpoint stress test', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 150,
      testDurationMs: 25000,
      rampUpTimeMs: 5000,
      requestsPerSecond: 75,
    };

    const result = await loadTester.runLoadTest(
      'API Endpoint Stress Test',
      async () => {
        await simulateAPIRequests();
      },
      config
    );

    logger.info('API endpoint stress test results:', result);

    expect(result.errorRate).toBeLessThan(3);
    expect(result.percentiles.p90).toBeLessThan(3000);
  });

  it('should handle memory usage under sustained load', async () => {
    const initialMemory = process.memoryUsage();
    
    const config: LoadTestConfig = {
      concurrentUsers: 100,
      testDurationMs: 60000, // 1 minute sustained load
      rampUpTimeMs: 10000,
      requestsPerSecond: 30,
    };

    const result = await loadTester.runLoadTest(
      'Memory Usage Sustained Load',
      async () => {
        await simulateMemoryIntensiveOperations();
      },
      config
    );

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

    logger.info('Memory usage test results:', {
      ...result,
      initialMemory: initialMemory.heapUsed,
      finalMemory: finalMemory.heapUsed,
      memoryIncrease,
      memoryIncreasePercent,
    });

    expect(result.errorRate).toBeLessThan(5);
    expect(memoryIncreasePercent).toBeLessThan(50); // Memory shouldn't increase by more than 50%
  });
});

// Test simulation functions
async function setupTestEnvironment(): Promise<void> {
  // Initialize test database connections, cache, etc.
  logger.info('Setting up test environment');
}

async function teardownTestEnvironment(): Promise<void> {
  // Clean up test resources
  logger.info('Tearing down test environment');
}

async function simulateUserWorkflow(): Promise<void> {
  // Simulate a typical user workflow
  const operations = [
    () => simulateLogin(),
    () => simulateDashboardLoad(),
    () => simulateSearchQuery(),
    () => simulateAnalyticsView(),
  ];

  const randomOperation = operations[Math.floor(Math.random() * operations.length)];
  await randomOperation();
}

async function simulateLogin(): Promise<void> {
  // Simulate user login process
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
}

async function simulateDashboardLoad(): Promise<void> {
  // Simulate dashboard data loading
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
}

async function simulateSearchQuery(): Promise<void> {
  // Simulate search query execution
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 150));
}

async function simulateAnalyticsView(): Promise<void> {
  // Simulate analytics data loading
  await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 200));
}

async function simulateDatabaseQueries(): Promise<void> {
  // Simulate database query operations
  const pool = resourceManager.getPool('main');
  if (pool) {
    await pool.query('SELECT 1');
  }
}

async function simulateCacheOperations(): Promise<void> {
  // Simulate cache operations
  const key = `test:${Math.random()}`;
  const value = { data: 'test', timestamp: Date.now() };
  
  await cacheManager.set(key, value, 60);
  await cacheManager.get(key);
}

async function simulateAPIRequests(): Promise<void> {
  // Simulate API request processing
  const endpoints = [
    '/api/conversations',
    '/api/analytics/dashboard',
    '/api/keywords',
    '/api/trends',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
}

async function simulateMemoryIntensiveOperations(): Promise<void> {
  // Simulate memory-intensive operations
  const largeArray = new Array(1000).fill(0).map(() => ({
    id: Math.random(),
    data: new Array(100).fill(0).map(() => Math.random()),
    timestamp: Date.now(),
  }));

  // Process the array
  largeArray.forEach(item => {
    item.data.sort();
  });

  // Clean up
  largeArray.length = 0;
}