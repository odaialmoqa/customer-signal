import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnalytics } from '@/lib/hooks/useAnalytics'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAnalytics())

    expect(result.current.dashboardMetrics).toBeNull()
    expect(result.current.loadingDashboard).toBe(false)
    expect(result.current.errorDashboard).toBeNull()
    expect(result.current.sentimentTrends).toEqual([])
    expect(result.current.keywordFrequency).toEqual([])
    expect(result.current.platformDistribution).toEqual([])
  })

  it('should fetch dashboard metrics on mount', async () => {
    const mockDashboardData = {
      totalConversations: 100,
      sentimentDistribution: { positive: 60, negative: 20, neutral: 20 },
      platformDistribution: [
        { platform: 'twitter', count: 50, percentage: 50, sentimentBreakdown: { positive: 30, negative: 10, neutral: 10 } }
      ],
      topKeywords: [],
      recentTrends: [],
      emergingThemes: [],
      timeRange: { start: '2024-01-01', end: '2024-01-31' }
    }

    const mockTrendsData = [
      {
        keyword: 'test',
        platform: 'twitter',
        timeBucket: '2024-01-01T00:00:00Z',
        positiveCount: 5,
        negativeCount: 2,
        neutralCount: 3,
        totalCount: 10,
        sentimentScore: 0.3
      }
    ]

    const mockKeywordData = [
      {
        keyword: 'test-keyword',
        totalMentions: 15,
        averageSentiment: 0.2,
        platforms: ['twitter', 'reddit'],
        recentTrend: 'up',
        engagementScore: 18
      }
    ]

    const mockPlatformData = [
      {
        platform: 'twitter',
        count: 50,
        percentage: 60,
        sentimentBreakdown: { positive: 30, negative: 10, neutral: 10 }
      }
    ]

    const mockClustersData = []
    const mockThemesData = []

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrendsData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockKeywordData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlatformData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockClustersData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockThemesData)
      })

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => {
      expect(result.current.dashboardMetrics).toEqual(mockDashboardData)
    })

    expect(result.current.sentimentTrends).toEqual(mockTrendsData)
    expect(result.current.keywordPerformance).toEqual(mockKeywordData)
    expect(result.current.platformDistribution).toEqual(mockPlatformData)
    expect(result.current.conversationClusters).toEqual(mockClustersData)
    expect(result.current.emergingThemes).toEqual(mockThemesData)
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => {
      expect(result.current.errorDashboard).toBe('Network error')
    })

    expect(result.current.loadingDashboard).toBe(false)
    expect(result.current.dashboardMetrics).toBeNull()
  })

  it('should handle HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' })
    })

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => {
      expect(result.current.errorDashboard).toBe('Failed to fetch dashboard metrics')
    })
  })

  it('should refresh dashboard metrics when called', async () => {
    const mockData = {
      totalConversations: 150,
      sentimentDistribution: { positive: 90, negative: 30, neutral: 30 },
      platformDistribution: [],
      topKeywords: [],
      recentTrends: [],
      emergingThemes: [],
      timeRange: { start: '2024-01-01', end: '2024-01-31' }
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    })

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => {
      expect(result.current.loadingDashboard).toBe(false)
    })

    // Call refresh
    await result.current.refreshDashboard()

    expect(result.current.dashboardMetrics).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/analytics/dashboard')
    )
  })

  it('should refresh sentiment trends with filters', async () => {
    const mockTrendsData = [
      {
        keyword: 'filtered-keyword',
        platform: 'twitter',
        timeBucket: '2024-01-01T00:00:00Z',
        positiveCount: 8,
        negativeCount: 1,
        neutralCount: 1,
        totalCount: 10,
        sentimentScore: 0.7
      }
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTrendsData)
    })

    const { result } = renderHook(() => useAnalytics())

    const filters = {
      keywords: ['filtered-keyword'],
      platforms: ['twitter'],
      intervalType: 'day' as const
    }

    await result.current.refreshTrends(filters)

    expect(result.current.sentimentTrends).toEqual(mockTrendsData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('keywords=filtered-keyword&platforms=twitter&interval_type=day')
    )
  })

  it('should refresh keywords with different types', async () => {
    const mockFrequencyData = [
      {
        keyword: 'frequent-keyword',
        frequency: 25,
        platforms: ['twitter', 'reddit'],
        sentimentDistribution: { positive: 15, negative: 5, neutral: 5 },
        firstSeen: '2024-01-01',
        lastSeen: '2024-01-05',
        trendDirection: 'rising'
      }
    ]

    const mockPerformanceData = [
      {
        keyword: 'performing-keyword',
        totalMentions: 20,
        averageSentiment: 0.4,
        platforms: ['twitter'],
        recentTrend: 'up',
        engagementScore: 24
      }
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFrequencyData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPerformanceData)
      })

    const { result } = renderHook(() => useAnalytics())

    // Test frequency type
    await result.current.refreshKeywords({}, 'frequency')
    expect(result.current.keywordFrequency).toEqual(mockFrequencyData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('type=frequency')
    )

    // Test performance type
    await result.current.refreshKeywords({}, 'performance')
    expect(result.current.keywordPerformance).toEqual(mockPerformanceData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('type=performance')
    )
  })

  it('should refresh platforms with different types', async () => {
    const mockDistributionData = [
      {
        platform: 'twitter',
        count: 75,
        percentage: 50,
        sentimentBreakdown: { positive: 45, negative: 15, neutral: 15 }
      }
    ]

    const mockPatternsData = [
      {
        keyword: 'cross-platform-topic',
        platform1: 'twitter',
        platform2: 'reddit',
        sharedConversations: 12,
        correlationStrength: 0.65,
        temporalOverlap: 0.7
      }
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDistributionData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatternsData)
      })

    const { result } = renderHook(() => useAnalytics())

    // Test distribution type
    await result.current.refreshPlatforms({}, 'distribution')
    expect(result.current.platformDistribution).toEqual(mockDistributionData)

    // Test patterns type
    await result.current.refreshPlatforms({}, 'patterns')
    expect(result.current.crossPlatformPatterns).toEqual(mockPatternsData)
  })

  it('should refresh time series data', async () => {
    const mockTimeSeriesData = [
      {
        date: '2024-01-01',
        value: 25,
        breakdown: { twitter: 15, reddit: 10 }
      },
      {
        date: '2024-01-02',
        value: 30,
        breakdown: { twitter: 18, reddit: 12 }
      }
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTimeSeriesData)
    })

    const { result } = renderHook(() => useAnalytics())

    await result.current.refreshTimeSeries('conversations', {
      intervalType: 'day'
    })

    expect(result.current.timeSeriesData).toEqual(mockTimeSeriesData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('metric=conversations&interval_type=day')
    )
  })

  it('should refresh all data when refreshAll is called', async () => {
    const mockResponses = [
      { totalConversations: 100, sentimentDistribution: {}, platformDistribution: [], topKeywords: [], recentTrends: [], emergingThemes: [], timeRange: {} },
      [],
      [],
      [],
      [],
      []
    ]

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.shift())
      })
    )

    const { result } = renderHook(() => useAnalytics())

    await result.current.refreshAll({
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    })

    // Should have called all the APIs
    expect(mockFetch).toHaveBeenCalledTimes(6) // dashboard, trends, keywords, platforms, clusters (2 calls)
  })

  it('should build query parameters correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })

    const { result } = renderHook(() => useAnalytics())

    const filters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      keywords: ['keyword1', 'keyword2'],
      platforms: ['twitter', 'reddit'],
      sentiments: ['positive', 'negative'] as const,
      intervalType: 'week' as const
    }

    await result.current.refreshDashboard(filters)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('start_date=2024-01-01')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('end_date=2024-01-31')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('keywords=keyword1%2Ckeyword2')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('platforms=twitter%2Creddit')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sentiments=positive%2Cnegative')
    )
  })

  it('should handle loading states correctly', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValue(promise)

    const { result } = renderHook(() => useAnalytics())

    // Should be loading initially
    expect(result.current.loadingDashboard).toBe(true)

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({
        totalConversations: 0,
        sentimentDistribution: {},
        platformDistribution: [],
        topKeywords: [],
        recentTrends: [],
        emergingThemes: [],
        timeRange: {}
      })
    })

    await waitFor(() => {
      expect(result.current.loadingDashboard).toBe(false)
    })
  })
})