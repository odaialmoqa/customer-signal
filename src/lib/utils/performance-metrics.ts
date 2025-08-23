import { performance } from 'perf_hooks';
import { logger } from './logger';

interface MetricPoint {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export class PerformanceMetrics {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private timers: Map<string, number> = new Map();
  private defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  // Counter methods
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.createKey(name, labels);
    return this.counters.get(key) || 0;
  }

  // Gauge methods
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
  }

  incrementGauge(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, current + value);
  }

  decrementGauge(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.incrementGauge(name, -value, labels);
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.createKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  // Histogram methods
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        buckets: this.defaultBuckets.map(le => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      };
      this.histograms.set(key, histogram);
    }

    histogram.sum += value;
    histogram.count++;

    // Update buckets
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  getHistogram(name: string, labels?: Record<string, string>): Histogram | undefined {
    const key = this.createKey(name, labels);
    return this.histograms.get(key);
  }

  // Timer methods
  startTimer(name: string, labels?: Record<string, string>): string {
    const key = this.createKey(name, labels);
    const timerId = `${key}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, performance.now());
    return timerId;
  }

  endTimer(timerId: string): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      logger.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = (performance.now() - startTime) / 1000; // Convert to seconds
    this.timers.delete(timerId);

    // Extract name and labels from timer ID
    const [nameWithLabels] = timerId.split('_');
    const [name, ...labelParts] = nameWithLabels.split('|');
    const labels = this.parseLabels(labelParts.join('|'));

    this.observeHistogram(`${name}_duration_seconds`, duration, labels);
    return duration;
  }

  // Timing decorator
  time<T>(
    name: string,
    labels?: Record<string, string>
  ): (target: any, propertyName: string, descriptor: PropertyDescriptor) => void {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]): Promise<T> {
        const timerId = metrics.startTimer(name, labels);
        try {
          const result = await method.apply(this, args);
          return result;
        } finally {
          metrics.endTimer(timerId);
        }
      };

      return descriptor;
    };
  }

  // Business metrics
  recordDatabaseQuery(duration: number, operation: string, success: boolean): void {
    this.observeHistogram('db_query_duration_seconds', duration, { operation });
    this.incrementCounter('db_queries_total', 1, { operation, status: success ? 'success' : 'error' });
  }

  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', duration?: number): void {
    this.incrementCounter('cache_operations_total', 1, { operation });
    if (duration !== undefined) {
      this.observeHistogram('cache_operation_duration_seconds', duration, { operation });
    }
  }

  recordHTTPRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.incrementCounter('http_requests_total', 1, { 
      method, 
      path: this.sanitizePath(path), 
      status: statusCode.toString() 
    });
    this.observeHistogram('http_request_duration_seconds', duration, { 
      method, 
      path: this.sanitizePath(path) 
    });
  }

  recordMonitoringPipeline(platform: string, success: boolean, duration: number): void {
    this.incrementCounter('monitoring_pipeline_total', 1, { platform, status: success ? 'success' : 'error' });
    this.observeHistogram('monitoring_pipeline_duration_seconds', duration, { platform });
  }

  recordSentimentAnalysis(provider: string, success: boolean, duration: number): void {
    this.incrementCounter('sentiment_analysis_total', 1, { provider, status: success ? 'success' : 'error' });
    this.observeHistogram('sentiment_analysis_duration_seconds', duration, { provider });
  }

  recordDataIntegration(platform: string, operation: string, success: boolean): void {
    this.incrementCounter('data_integration_operations_total', 1, { 
      platform, 
      operation, 
      status: success ? 'success' : 'error' 
    });
  }

  recordAlertDelivery(channel: string, success: boolean): void {
    this.incrementCounter('alert_deliveries_total', 1, { channel, status: success ? 'success' : 'error' });
  }

  // System metrics
  recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('nodejs_memory_external_bytes', memUsage.external);
    this.setGauge('nodejs_memory_rss_bytes', memUsage.rss);
  }

  recordEventLoopLag(): void {
    const start = performance.now();
    setImmediate(() => {
      const lag = performance.now() - start;
      this.observeHistogram('nodejs_eventloop_lag_seconds', lag / 1000);
    });
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key);
      const labelString = this.formatLabels(labels);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labelString} ${value}`);
    }

    // Export gauges
    for (const [key, value] of this.gauges) {
      const { name, labels } = this.parseKey(key);
      const labelString = this.formatLabels(labels);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labelString} ${value}`);
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      const { name, labels } = this.parseKey(key);
      const labelString = this.formatLabels(labels);
      
      lines.push(`# TYPE ${name} histogram`);
      
      // Buckets
      for (const bucket of histogram.buckets) {
        const bucketLabels = { ...labels, le: bucket.le.toString() };
        const bucketLabelString = this.formatLabels(bucketLabels);
        lines.push(`${name}_bucket${bucketLabelString} ${bucket.count}`);
      }
      
      // +Inf bucket
      const infLabels = { ...labels, le: '+Inf' };
      const infLabelString = this.formatLabels(infLabels);
      lines.push(`${name}_bucket${infLabelString} ${histogram.count}`);
      
      // Sum and count
      lines.push(`${name}_sum${labelString} ${histogram.sum}`);
      lines.push(`${name}_count${labelString} ${histogram.count}`);
    }

    return lines.join('\n');
  }

  // Utility methods
  private createKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${name}|${labelString}`;
  }

  private parseKey(key: string): { name: string; labels: Record<string, string> } {
    const [name, labelString] = key.split('|');
    const labels = this.parseLabels(labelString);
    return { name, labels };
  }

  private parseLabels(labelString?: string): Record<string, string> {
    if (!labelString) return {};
    
    const labels: Record<string, string> = {};
    const pairs = labelString.split(',');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        labels[key] = value;
      }
    }
    
    return labels;
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    
    const labelPairs = entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }

  private sanitizePath(path: string): string {
    // Replace dynamic path segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
  }

  // Start automatic system metrics collection
  startSystemMetricsCollection(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(() => {
      this.recordMemoryUsage();
      this.recordEventLoopLag();
    }, intervalMs);
  }
}

// Singleton instance
let metricsInstance: PerformanceMetrics | null = null;

export function getMetrics(): PerformanceMetrics {
  if (!metricsInstance) {
    metricsInstance = new PerformanceMetrics();
  }
  return metricsInstance;
}

// Export singleton for convenience
export const metrics = getMetrics();

export default PerformanceMetrics;