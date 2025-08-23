import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyticsCache } from '@/lib/utils/analytics-cache'

describe('AnalyticsCache', () => {
  beforeEach(() => {
    analyticsCache.clear()
  })

  it('should store and retrieve data', () => {
    const testData = { value: 'test' }
    const params = { tenantId: 'test', startDate: '2024-01-01' }

    analyticsCache.set('test_prefix', params, testData)
    const retrieved = analyticsCache.get('test_prefix', params)

    expect(retrieved).toEqual(testData)
  })

  it('should return null for non-existent keys', () => {
    const params = { tenantId: 'test' }
    const retrieved = analyticsCache.get('non_existent', params)

    expect(retrieved).toBeNull()
  })

  it('should expire data after TTL', () => {
    const testData = { value: 'test' }
    const params = { tenantId: 'test' }
    const shortTTL = 10 // 10ms

    analyticsCache.set('test_prefix', params, testData, shortTTL)

    // Should be available immediately
    expect(analyticsCache.get('test_prefix', params)).toEqual(testData)

    // Wait for expiration
    return new Promise(resolve => {
      setTimeout(() => {
        expect(analyticsCache.get('test_prefix', params)).toBeNull()
        resolve(undefined)
      }, 20)
    })
  })

  it('should generate consistent keys for same parameters', () => {
    const testData1 = { value: 'test1' }
    const testData2 = { value: 'test2' }
    const params = { tenantId: 'test', startDate: '2024-01-01' }

    analyticsCache.set('test_prefix', params, testData1)
    analyticsCache.set('test_prefix', params, testData2) // Should overwrite

    const retrieved = analyticsCache.get('test_prefix', params)
    expect(retrieved).toEqual(testData2)
  })

  it('should generate different keys for different parameters', () => {
    const testData1 = { value: 'test1' }
    const testData2 = { value: 'test2' }
    const params1 = { tenantId: 'test1' }
    const params2 = { tenantId: 'test2' }

    analyticsCache.set('test_prefix', params1, testData1)
    analyticsCache.set('test_prefix', params2, testData2)

    expect(analyticsCache.get('test_prefix', params1)).toEqual(testData1)
    expect(analyticsCache.get('test_prefix', params2)).toEqual(testData2)
  })

  it('should clear cache by prefix', () => {
    const testData = { value: 'test' }
    const params = { tenantId: 'test' }

    analyticsCache.set('prefix1', params, testData)
    analyticsCache.set('prefix2', params, testData)

    analyticsCache.clearByPrefix('prefix1')

    expect(analyticsCache.get('prefix1', params)).toBeNull()
    expect(analyticsCache.get('prefix2', params)).toEqual(testData)
  })

  it('should clear all cache', () => {
    const testData = { value: 'test' }
    const params = { tenantId: 'test' }

    analyticsCache.set('prefix1', params, testData)
    analyticsCache.set('prefix2', params, testData)

    analyticsCache.clear()

    expect(analyticsCache.get('prefix1', params)).toBeNull()
    expect(analyticsCache.get('prefix2', params)).toBeNull()
  })

  it('should provide cache statistics', () => {
    const testData = { value: 'test' }
    const params1 = { tenantId: 'test1' }
    const params2 = { tenantId: 'test2' }

    analyticsCache.set('prefix1', params1, testData)
    analyticsCache.set('prefix2', params2, testData)

    const stats = analyticsCache.getStats()
    expect(stats.size).toBe(2)
    expect(stats.keys).toHaveLength(2)
    expect(stats.keys.every(key => typeof key === 'string')).toBe(true)
  })

  it('should cleanup expired entries', () => {
    const testData = { value: 'test' }
    const params = { tenantId: 'test' }
    const shortTTL = 10 // 10ms

    analyticsCache.set('test_prefix', params, testData, shortTTL)

    // Should be available immediately
    expect(analyticsCache.get('test_prefix', params)).toEqual(testData)

    return new Promise(resolve => {
      setTimeout(() => {
        analyticsCache.cleanup()
        const stats = analyticsCache.getStats()
        expect(stats.size).toBe(0)
        resolve(undefined)
      }, 20)
    })
  })

  it('should handle complex parameter objects', () => {
    const testData = { value: 'test' }
    const complexParams = {
      tenantId: 'test',
      filters: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        keywords: ['keyword1', 'keyword2'],
        platforms: ['twitter', 'reddit']
      },
      options: {
        limit: 50,
        offset: 0
      }
    }

    analyticsCache.set('complex_test', complexParams, testData)
    const retrieved = analyticsCache.get('complex_test', complexParams)

    expect(retrieved).toEqual(testData)
  })

  it('should handle parameter order independence', () => {
    const testData = { value: 'test' }
    const params1 = { a: 1, b: 2, c: 3 }
    const params2 = { c: 3, a: 1, b: 2 } // Different order, same values

    analyticsCache.set('order_test', params1, testData)
    const retrieved = analyticsCache.get('order_test', params2)

    expect(retrieved).toEqual(testData)
  })
})