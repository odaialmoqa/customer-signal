import { useState, useEffect, useCallback } from 'react'
import { TrendAnalysisResult, TrendingTopic, StoryCluster, TrendAnalysisOptions } from '@/lib/services/trend-analysis'

interface UseTrendAnalysisOptions extends TrendAnalysisOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseTrendAnalysisReturn {
  data: TrendAnalysisResult | null
  trendingTopics: TrendingTopic[]
  storyClusters: StoryCluster[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getTrendingTopics: (options?: TrendAnalysisOptions) => Promise<TrendingTopic[]>
  getStoryClusters: (options?: TrendAnalysisOptions) => Promise<StoryCluster[]>
  getRelatedConversations: (trendId: string, limit?: number) => Promise<any[]>
}

export function useTrendAnalysis(options: UseTrendAnalysisOptions = {}): UseTrendAnalysisReturn {
  const [data, setData] = useState<TrendAnalysisResult | null>(null)
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [storyClusters, setStoryClusters] = useState<StoryCluster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    ...analysisOptions
  } = options

  const buildQueryParams = useCallback((opts: TrendAnalysisOptions) => {
    const params = new URLSearchParams()
    
    if (opts.timeRange) {
      params.append('start', opts.timeRange.start)
      params.append('end', opts.timeRange.end)
    }
    
    if (opts.platforms?.length) {
      params.append('platforms', opts.platforms.join(','))
    }
    
    if (opts.keywords?.length) {
      params.append('keywords', opts.keywords.join(','))
    }
    
    if (opts.minConversationCount !== undefined) {
      params.append('minConversationCount', opts.minConversationCount.toString())
    }
    
    if (opts.minRelevanceScore !== undefined) {
      params.append('minRelevanceScore', opts.minRelevanceScore.toString())
    }
    
    if (opts.includeEmergingTrends !== undefined) {
      params.append('includeEmergingTrends', opts.includeEmergingTrends.toString())
    }
    
    if (opts.maxResults !== undefined) {
      params.append('maxResults', opts.maxResults.toString())
    }

    return params.toString()
  }, [])

  const fetchTrendAnalysis = useCallback(async (opts: TrendAnalysisOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = buildQueryParams({ ...analysisOptions, ...opts })
      const response = await fetch(`/api/trends?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trend analysis: ${response.statusText}`)
      }

      const result: TrendAnalysisResult = await response.json()
      setData(result)
      setTrendingTopics(result.trendingTopics)
      setStoryClusters(result.storyClusters)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trend analysis'
      setError(errorMessage)
      console.error('Error fetching trend analysis:', err)
    } finally {
      setLoading(false)
    }
  }, [analysisOptions, buildQueryParams])

  const getTrendingTopics = useCallback(async (opts: TrendAnalysisOptions = {}): Promise<TrendingTopic[]> => {
    try {
      const queryParams = buildQueryParams({ ...analysisOptions, ...opts })
      const response = await fetch(`/api/trends/topics?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending topics: ${response.statusText}`)
      }

      const result = await response.json()
      return result.trendingTopics || []
    } catch (err) {
      console.error('Error fetching trending topics:', err)
      throw err
    }
  }, [analysisOptions, buildQueryParams])

  const getStoryClusters = useCallback(async (opts: TrendAnalysisOptions = {}): Promise<StoryCluster[]> => {
    try {
      const queryParams = buildQueryParams({ ...analysisOptions, ...opts })
      const response = await fetch(`/api/trends/stories?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch story clusters: ${response.statusText}`)
      }

      const result = await response.json()
      return result.storyClusters || []
    } catch (err) {
      console.error('Error fetching story clusters:', err)
      throw err
    }
  }, [analysisOptions, buildQueryParams])

  const getRelatedConversations = useCallback(async (trendId: string, limit: number = 50): Promise<any[]> => {
    try {
      const response = await fetch(`/api/trends/${trendId}/related?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch related conversations: ${response.statusText}`)
      }

      const result = await response.json()
      return result.conversations || []
    } catch (err) {
      console.error('Error fetching related conversations:', err)
      throw err
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchTrendAnalysis()
  }, [fetchTrendAnalysis])

  // Initial load
  useEffect(() => {
    fetchTrendAnalysis()
  }, [fetchTrendAnalysis])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchTrendAnalysis()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchTrendAnalysis])

  return {
    data,
    trendingTopics,
    storyClusters,
    loading,
    error,
    refresh,
    getTrendingTopics,
    getStoryClusters,
    getRelatedConversations
  }
}

// Hook for getting trending topics only
export function useTrendingTopics(options: TrendAnalysisOptions = {}) {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { getTrendingTopics } = useTrendAnalysis()

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getTrendingTopics(options)
      setTopics(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trending topics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [getTrendingTopics, options])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  return {
    topics,
    loading,
    error,
    refresh: fetchTopics
  }
}

// Hook for getting story clusters only
export function useStoryClusters(options: TrendAnalysisOptions = {}) {
  const [clusters, setClusters] = useState<StoryCluster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { getStoryClusters } = useTrendAnalysis()

  const fetchClusters = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getStoryClusters(options)
      setClusters(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch story clusters'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [getStoryClusters, options])

  useEffect(() => {
    fetchClusters()
  }, [fetchClusters])

  return {
    clusters,
    loading,
    error,
    refresh: fetchClusters
  }
}