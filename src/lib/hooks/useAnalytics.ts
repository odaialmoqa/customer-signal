import { useState, useEffect, useCallback } from 'react'
import { 
  DashboardMetrics, 
  TrendData, 
  KeywordFrequency, 
  KeywordPerformance,
  PlatformDistribution,
  ConversationCluster,
  CrossPlatformPattern,
  EmergingTheme,
  AnalyticsFilters 
} from '@/lib/services/analytics'

interface UseAnalyticsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAnalyticsReturn {
  // Dashboard metrics
  dashboardMetrics: DashboardMetrics | null
  loadingDashboard: boolean
  errorDashboard: string | null
  refreshDashboard: () => Promise<void>

  // Sentiment trends
  sentimentTrends: TrendData[]
  loadingTrends: boolean
  errorTrends: string | null
  refreshTrends: (filters?: AnalyticsFilters) => Promise<void>

  // Keyword data
  keywordFrequency: KeywordFrequency[]
  keywordPerformance: KeywordPerformance[]
  loadingKeywords: boolean
  errorKeywords: string | null
  refreshKeywords: (filters?: AnalyticsFilters, type?: 'frequency' | 'performance') => Promise<void>

  // Platform data
  platformDistribution: PlatformDistribution[]
  crossPlatformPatterns: CrossPlatformPattern[]
  loadingPlatforms: boolean
  errorPlatforms: string | null
  refreshPlatforms: (filters?: AnalyticsFilters, type?: 'distribution' | 'patterns') => Promise<void>

  // Clusters and themes
  conversationClusters: ConversationCluster[]
  emergingThemes: EmergingTheme[]
  loadingClusters: boolean
  errorClusters: string | null
  refreshClusters: (filters?: AnalyticsFilters) => Promise<void>

  // Time series data
  timeSeriesData: Array<{ date: string; value: number; breakdown?: Record<string, number> }>
  loadingTimeSeries: boolean
  errorTimeSeries: string | null
  refreshTimeSeries: (metric: 'conversations' | 'sentiment' | 'keywords', filters?: AnalyticsFilters) => Promise<void>

  // Global refresh
  refreshAll: (filters?: AnalyticsFilters) => Promise<void>
}

export function useAnalytics(
  initialFilters: AnalyticsFilters = {},
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
  const { autoRefresh = false, refreshInterval = 300000 } = options // 5 minutes default

  // Dashboard metrics state
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [errorDashboard, setErrorDashboard] = useState<string | null>(null)

  // Sentiment trends state
  const [sentimentTrends, setSentimentTrends] = useState<TrendData[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [errorTrends, setErrorTrends] = useState<string | null>(null)

  // Keyword data state
  const [keywordFrequency, setKeywordFrequency] = useState<KeywordFrequency[]>([])
  const [keywordPerformance, setKeywordPerformance] = useState<KeywordPerformance[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  const [errorKeywords, setErrorKeywords] = useState<string | null>(null)

  // Platform data state
  const [platformDistribution, setPlatformDistribution] = useState<PlatformDistribution[]>([])
  const [crossPlatformPatterns, setCrossPlatformPatterns] = useState<CrossPlatformPattern[]>([])
  const [loadingPlatforms, setLoadingPlatforms] = useState(false)
  const [errorPlatforms, setErrorPlatforms] = useState<string | null>(null)

  // Clusters and themes state
  const [conversationClusters, setConversationClusters] = useState<ConversationCluster[]>([])
  const [emergingThemes, setEmergingThemes] = useState<EmergingTheme[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [errorClusters, setErrorClusters] = useState<string | null>(null)

  // Time series data state
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{ date: string; value: number; breakdown?: Record<string, number> }>>([])
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(false)
  const [errorTimeSeries, setErrorTimeSeries] = useState<string | null>(null)

  // Helper function to build query params
  const buildQueryParams = useCallback((filters: AnalyticsFilters = {}) => {
    const params = new URLSearchParams()
    
    if (filters.startDate) params.set('start_date', filters.startDate)
    if (filters.endDate) params.set('end_date', filters.endDate)
    if (filters.keywords?.length) params.set('keywords', filters.keywords.join(','))
    if (filters.platforms?.length) params.set('platforms', filters.platforms.join(','))
    if (filters.sentiments?.length) params.set('sentiments', filters.sentiments.join(','))
    if (filters.intervalType) params.set('interval_type', filters.intervalType)
    
    return params.toString()
  }, [])

  // Dashboard metrics functions
  const refreshDashboard = useCallback(async (filters: AnalyticsFilters = initialFilters) => {
    setLoadingDashboard(true)
    setErrorDashboard(null)
    
    try {
      const queryParams = buildQueryParams(filters)
      const response = await fetch(`/api/analytics/dashboard?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics')
      }
      
      const data = await response.json()
      setDashboardMetrics(data)
    } catch (error) {
      setErrorDashboard(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingDashboard(false)
    }
  }, [initialFilters, buildQueryParams])

  // Sentiment trends functions
  const refreshTrends = useCallback(async (filters: AnalyticsFilters = initialFilters) => {
    setLoadingTrends(true)
    setErrorTrends(null)
    
    try {
      const queryParams = buildQueryParams(filters)
      const response = await fetch(`/api/analytics/trends?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment trends')
      }
      
      const data = await response.json()
      setSentimentTrends(data)
    } catch (error) {
      setErrorTrends(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingTrends(false)
    }
  }, [initialFilters, buildQueryParams])

  // Keyword functions
  const refreshKeywords = useCallback(async (
    filters: AnalyticsFilters = initialFilters,
    type: 'frequency' | 'performance' = 'frequency'
  ) => {
    setLoadingKeywords(true)
    setErrorKeywords(null)
    
    try {
      const queryParams = buildQueryParams(filters)
      const params = new URLSearchParams(queryParams)
      params.set('type', type)
      
      const response = await fetch(`/api/analytics/keywords?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch keyword data')
      }
      
      const data = await response.json()
      
      if (type === 'frequency') {
        setKeywordFrequency(data)
      } else {
        setKeywordPerformance(data)
      }
    } catch (error) {
      setErrorKeywords(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingKeywords(false)
    }
  }, [initialFilters, buildQueryParams])

  // Platform functions
  const refreshPlatforms = useCallback(async (
    filters: AnalyticsFilters = initialFilters,
    type: 'distribution' | 'patterns' = 'distribution'
  ) => {
    setLoadingPlatforms(true)
    setErrorPlatforms(null)
    
    try {
      const queryParams = buildQueryParams(filters)
      const params = new URLSearchParams(queryParams)
      params.set('type', type)
      
      const response = await fetch(`/api/analytics/platforms?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch platform data')
      }
      
      const data = await response.json()
      
      if (type === 'distribution') {
        setPlatformDistribution(data)
      } else {
        setCrossPlatformPatterns(data)
      }
    } catch (error) {
      setErrorPlatforms(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingPlatforms(false)
    }
  }, [initialFilters, buildQueryParams])

  // Clusters and themes functions
  const refreshClusters = useCallback(async (filters: AnalyticsFilters = initialFilters) => {
    setLoadingClusters(true)
    setErrorClusters(null)
    
    try {
      // Fetch clusters
      const clustersParams = buildQueryParams(filters)
      const clustersResponse = await fetch(`/api/analytics/clusters?${clustersParams}`)
      
      if (!clustersResponse.ok) {
        throw new Error('Failed to fetch conversation clusters')
      }
      
      const clustersData = await clustersResponse.json()
      setConversationClusters(clustersData)

      // Fetch emerging themes
      const themesResponse = await fetch('/api/analytics/themes')
      
      if (!themesResponse.ok) {
        throw new Error('Failed to fetch emerging themes')
      }
      
      const themesData = await themesResponse.json()
      setEmergingThemes(themesData)
    } catch (error) {
      setErrorClusters(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingClusters(false)
    }
  }, [initialFilters, buildQueryParams])

  // Time series functions
  const refreshTimeSeries = useCallback(async (
    metric: 'conversations' | 'sentiment' | 'keywords',
    filters: AnalyticsFilters = initialFilters
  ) => {
    setLoadingTimeSeries(true)
    setErrorTimeSeries(null)
    
    try {
      const queryParams = buildQueryParams(filters)
      const params = new URLSearchParams(queryParams)
      params.set('metric', metric)
      
      const response = await fetch(`/api/analytics/timeseries?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch time series data')
      }
      
      const data = await response.json()
      setTimeSeriesData(data)
    } catch (error) {
      setErrorTimeSeries(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingTimeSeries(false)
    }
  }, [initialFilters, buildQueryParams])

  // Global refresh function
  const refreshAll = useCallback(async (filters: AnalyticsFilters = initialFilters) => {
    await Promise.all([
      refreshDashboard(filters),
      refreshTrends(filters),
      refreshKeywords(filters, 'performance'),
      refreshPlatforms(filters, 'distribution'),
      refreshClusters(filters)
    ])
  }, [refreshDashboard, refreshTrends, refreshKeywords, refreshPlatforms, refreshClusters, initialFilters])

  // Initial load
  useEffect(() => {
    refreshAll()
  }, []) // Only run on mount

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshAll()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshAll])

  return {
    // Dashboard metrics
    dashboardMetrics,
    loadingDashboard,
    errorDashboard,
    refreshDashboard,

    // Sentiment trends
    sentimentTrends,
    loadingTrends,
    errorTrends,
    refreshTrends,

    // Keyword data
    keywordFrequency,
    keywordPerformance,
    loadingKeywords,
    errorKeywords,
    refreshKeywords,

    // Platform data
    platformDistribution,
    crossPlatformPatterns,
    loadingPlatforms,
    errorPlatforms,
    refreshPlatforms,

    // Clusters and themes
    conversationClusters,
    emergingThemes,
    loadingClusters,
    errorClusters,
    refreshClusters,

    // Time series data
    timeSeriesData,
    loadingTimeSeries,
    errorTimeSeries,
    refreshTimeSeries,

    // Global refresh
    refreshAll
  }
}