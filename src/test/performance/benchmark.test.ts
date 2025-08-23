import { describe, it, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { logger } from '../../lib/utils/logger';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  operationsPerSecond: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: NodeJS.MemoryUsage;
  };
}

class Benchmark {
  async run(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    logger.info(`Running benchmark: ${name} (${iterations} iterations)`);

    const times: number[] = [];
    const memoryBefore = process.memoryUsage();

    // Warm up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await operation();
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    const totalTime = endTime - startTime;
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const operationsPerSecond = iterations / (totalTime / 1000);

    const memoryDelta: NodeJS.MemoryUsage = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
    };

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      operationsPerSecond,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryDelta,
      },
    };

    logger.info(`Benchmark ${name} completed:`, {
      averageTime: `${averageTime.toFixed(2)}ms`,
      operationsPerSecond: `${operationsPerSecond.toFixed(2)} ops/sec`,
      memoryDelta: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    });

    return result;
  }

  async compare(
    benchmarks: Array<{
      name: string;
      operation: () => Promise<void> | void;
    }>,
    iterations: number = 1000
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const benchmark of benchmarks) {
      const result = await this.run(benchmark.name, benchmark.operation, iterations);
      results.push(result);
    }

    // Sort by operations per second (descending)
    results.sort((a, b) => b.operationsPerSecond - a.operationsPerSecond);

    logger.info('Benchmark comparison results:');
    results.forEach((result, index) => {
      const fastest = results[0];
      const ratio = fastest.operationsPerSecond / result.operationsPerSecond;
      logger.info(`${index + 1}. ${result.name}: ${result.operationsPerSecond.toFixed(2)} ops/sec ${ratio > 1 ? `(${ratio.toFixed(2)}x slower)` : '(fastest)'}`);
    });

    return results;
  }
}

describe('Performance Benchmarks', () => {
  let benchmark: Benchmark;

  beforeAll(() => {
    benchmark = new Benchmark();
  });

  it('should benchmark database query performance', async () => {
    const result = await benchmark.run(
      'Database Query Performance',
      async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
      },
      500
    );

    expect(result.averageTime).toBeLessThan(50); // Should be under 50ms average
    expect(result.operationsPerSecond).toBeGreaterThan(20); // At least 20 ops/sec
  });

  it('should benchmark cache operations', async () => {
    const cache = new Map();

    const result = await benchmark.run(
      'Cache Operations',
      () => {
        const key = `key_${Math.floor(Math.random() * 1000)}`;
        const value = { data: Math.random(), timestamp: Date.now() };
        cache.set(key, value);
        cache.get(key);
      },
      10000
    );

    expect(result.averageTime).toBeLessThan(1); // Should be very fast
    expect(result.operationsPerSecond).toBeGreaterThan(10000); // Very high throughput
  });

  it('should benchmark JSON serialization/deserialization', async () => {
    const testData = {
      id: 'test-id',
      content: 'This is a test conversation with some content',
      author: 'test-author',
      platform: 'twitter',
      sentiment: 'positive',
      keywords: ['test', 'benchmark', 'performance'],
      tags: ['important', 'customer-feedback'],
      timestamp: new Date().toISOString(),
      metadata: {
        engagement: { likes: 10, shares: 5, comments: 2 },
        location: 'US',
        language: 'en',
      },
    };

    const result = await benchmark.run(
      'JSON Serialization/Deserialization',
      () => {
        const serialized = JSON.stringify(testData);
        JSON.parse(serialized);
      },
      5000
    );

    expect(result.averageTime).toBeLessThan(5); // Should be very fast
    expect(result.operationsPerSecond).toBeGreaterThan(1000);
  });

  it('should benchmark sentiment analysis simulation', async () => {
    const sentimentAnalysis = (text: string) => {
      // Simulate sentiment analysis processing
      const words = text.split(' ');
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst'];
      
      let score = 0;
      words.forEach(word => {
        if (positiveWords.includes(word.toLowerCase())) score += 1;
        if (negativeWords.includes(word.toLowerCase())) score -= 1;
      });
      
      return {
        sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
        score: score / words.length,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      };
    };

    const testTexts = [
      'This product is amazing and I love using it every day',
      'The service was terrible and I hate the experience',
      'It works fine, nothing special but gets the job done',
      'Great customer support, they helped me quickly',
      'Worst purchase ever, complete waste of money',
    ];

    const result = await benchmark.run(
      'Sentiment Analysis Simulation',
      () => {
        const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
        sentimentAnalysis(randomText);
      },
      2000
    );

    expect(result.averageTime).toBeLessThan(10);
    expect(result.operationsPerSecond).toBeGreaterThan(100);
  });

  it('should benchmark array operations for large datasets', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      category: `category_${i % 10}`,
      timestamp: Date.now() - Math.random() * 86400000, // Random time in last 24h
    }));

    const result = await benchmark.run(
      'Large Dataset Array Operations',
      () => {
        // Simulate common operations on large datasets
        const filtered = largeDataset.filter(item => item.value > 0.5);
        const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
        const grouped = sorted.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        }, {} as Record<string, typeof largeDataset>);
        
        // Get top categories
        Object.keys(grouped).slice(0, 5);
      },
      100
    );

    expect(result.averageTime).toBeLessThan(100); // Should handle large datasets efficiently
    expect(result.operationsPerSecond).toBeGreaterThan(10);
  });

  it('should compare different caching strategies', async () => {
    const mapCache = new Map();
    const objectCache: Record<string, any> = {};
    const weakMapCache = new WeakMap();
    const testObjects = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

    const results = await benchmark.compare([
      {
        name: 'Map Cache',
        operation: () => {
          const key = `key_${Math.floor(Math.random() * 1000)}`;
          const value = { data: Math.random() };
          mapCache.set(key, value);
          mapCache.get(key);
        },
      },
      {
        name: 'Object Cache',
        operation: () => {
          const key = `key_${Math.floor(Math.random() * 1000)}`;
          const value = { data: Math.random() };
          objectCache[key] = value;
          const retrieved = objectCache[key];
        },
      },
      {
        name: 'WeakMap Cache',
        operation: () => {
          const keyObj = testObjects[Math.floor(Math.random() * testObjects.length)];
          const value = { data: Math.random() };
          weakMapCache.set(keyObj, value);
          weakMapCache.get(keyObj);
        },
      },
    ], 5000);

    // Map should generally be fastest for string keys
    expect(results[0].operationsPerSecond).toBeGreaterThan(1000);
  });

  it('should benchmark string operations for content processing', async () => {
    const sampleTexts = [
      'This is a sample text for processing and analysis',
      'Another example with different content and keywords',
      'Social media post with hashtags #performance #testing',
      'Customer feedback about our product and service quality',
      'Review text with sentiment and emotional content',
    ];

    const result = await benchmark.run(
      'String Processing Operations',
      () => {
        const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        
        // Common string operations
        const words = text.toLowerCase().split(/\s+/);
        const filtered = words.filter(word => word.length > 3);
        const unique = [...new Set(filtered)];
        const joined = unique.join(' ');
        const regex = /\b\w{4,}\b/g;
        const matches = text.match(regex) || [];
        
        return {
          wordCount: words.length,
          uniqueWords: unique.length,
          matches: matches.length,
        };
      },
      3000
    );

    expect(result.averageTime).toBeLessThan(5);
    expect(result.operationsPerSecond).toBeGreaterThan(500);
  });
});

// Memory leak detection test
describe('Memory Leak Detection', () => {
  it('should not leak memory during sustained operations', async () => {
    const initialMemory = process.memoryUsage();
    const operations = 10000;
    const cache = new Map();

    // Perform many operations
    for (let i = 0; i < operations; i++) {
      const key = `key_${i}`;
      const value = { data: new Array(100).fill(i), timestamp: Date.now() };
      
      cache.set(key, value);
      
      // Periodically clean up old entries
      if (i % 1000 === 0 && cache.size > 5000) {
        const keysToDelete = Array.from(cache.keys()).slice(0, 1000);
        keysToDelete.forEach(k => cache.delete(k));
      }
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

    logger.info('Memory leak test results:', {
      initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      increase: `${memoryIncreaseMB.toFixed(2)}MB`,
      operations,
    });

    // Memory increase should be reasonable for the number of operations
    expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase
  });
});