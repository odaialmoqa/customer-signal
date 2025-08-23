'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { AnalyticsFilters } from '@/lib/services/analytics'
import { SentimentTrendChart } from './SentimentTrendChart'
import { ConversationVolumeChart } from './ConversationVolumeChart'
import { PlatformDistributionChart } from './PlatformDistributionChart'
import { KeywordPerformanceChart } from './KeywordPerformanceChart'
import { AnalyticsFilters as FiltersComponent } from './AnalyticsFilters'
import { AnalyticsMetrics } from './AnalyticsMetrics'
import { ChartContainer } from './ChartContainer'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface AnalyticsDashboardProps {
  initialFilters?: AnalyticsFilters
  autoRefresh?: boolean
  refreshInterval?: number
}

export function AnalyticsDashboard({
  initialFilters = {},
  autoRefresh = false,
  refreshInterval = 300000
}: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters)
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [drillDownData, setDrillDownData] = useState<any>(null)

  const {
    dashboardMetrics,
    loadingDashboard,
    errorDashboard,
    sentimentTrends,
    loadingTrends,
    errorTrends,
    platformDistribution,
    loadingPlatforms,
    errorPlatforms,
    keywordPerformance,
    loadingKeywords,
    errorKeywords,
    timeSeriesData,
    loadingTimeSeries,
    errorTimeSeries,
    refreshAll,
    refreshTrends,
    refreshPlatforms,
    refreshKeywords,
    refreshTimeSeries
  } = useAnalytics(filters, { autoRefresh, refreshInterval })

  const handleFiltersChange = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters)
    refreshAll(newFilters)
  }, [refreshAll])

  const handleChartDrillDown = useCallback((chartType: string, data: any) => {
    setSelectedChart(chartType)
    setDrillDownData(data)
    
    // Create drill-down filters based on the clicked data
    let drillDownFilters: AnalyticsFilters = { ...filters }
    
    switch (chartType) {
      case 'sentiment':
        if (data.date) {
          drillDownFilters = {
            ...filters,
            startDate: data.date,
            endDate: data.date
          }
        }
        break
      case 'platform':
        if (data.platform) {
          drillDownFilters = {
            ...filters,
            platforms: [data.platform]
          }
        }
        break
      case 'keyword':
        if (data.keyword) {
          drillDownFilters = {
            ...filters,
            keywords: [data.keyword]
          }
        }
        break
    }
    
    // Refresh relevant data with drill-down filters
    if (chartType === 'sentiment') {
      refreshTrends(drillDownFilters)
    } else if (chartType === 'platform') {
      refreshPlatforms(drillDownFilters)
    } else if (chartType === 'keyword') {
      refreshKeywords(drillDownFilters)
    }
  }, [filters, refreshTrends, refreshPlatforms, refreshKeywords])

  const handleCloseDrillDown = useCallback(() => {
    setSelectedChart(null)
    setDrillDownData(null)
    // Refresh with original filters
    refreshAll(filters)
  }, [filters, refreshAll])

  const isLoading = loadingDashboard || loadingTrends || loadingPlatforms || loadingKeywords || loadingTimeSeries
  const hasError = errorDashboard || errorTrends || errorPlatforms || errorKeywords || errorTimeSeries

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor conversations and sentiment across all platforms</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshAll(filters)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <FiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={isLoading}
      />

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading analytics data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorDashboard || errorTrends || errorPlatforms || errorKeywords || errorTimeSeries}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      {selectedChart && drillDownData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detailed View: {selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)}
              </h3>
              <button
                onClick={handleCloseDrillDown}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-96">
              {selectedChart === 'sentiment' && (
                <SentimentTrendChart
                  data={sentimentTrends}
                  height={350}
                  interactive={false}
                />
              )}
              {selectedChart === 'platform' && (
                <PlatformDistributionChart
                  data={platformDistribution}
                  height={350}
                  showSentimentBreakdown={true}
                  interactive={false}
                />
              )}
              {selectedChart === 'keyword' && (
                <KeywordPerformanceChart
                  data={keywordPerformance}
                  height={350}
                  chartType="scatter"
                  interactive={false}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <AnalyticsMetrics
        metrics={dashboardMetrics}
        loading={loadingDashboard}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Trends */}
        <ChartContainer
          title="Sentiment Trends Over Time"
          subtitle="Track how sentiment changes across conversations"
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          loading={loadingTrends}
          error={errorTrends}
          onExpand={() => handleChartDrillDown('sentiment', { type: 'sentiment' })}
        >
          <SentimentTrendChart
            data={sentimentTrends}
            height={300}
            onDataPointClick={(data) => handleChartDrillDown('sentiment', data)}
          />
        </ChartContainer>

        {/* Conversation Volume */}
        <ChartContainer
          title="Conversation Volume"
          subtitle="Daily conversation counts across platforms"
          icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
          loading={loadingTimeSeries}
          error={errorTimeSeries}
          onExpand={() => handleChartDrillDown('volume', { type: 'volume' })}
        >
          <ConversationVolumeChart
            data={timeSeriesData}
            height={300}
            showBreakdown={true}
            onDataPointClick={(data) => handleChartDrillDown('volume', data)}
          />
        </ChartContainer>

        {/* Platform Distribution */}
        <ChartContainer
          title="Platform Distribution"
          subtitle="Where conversations are happening"
          icon={<ChartBarIcon className="h-5 w-5" />}
          loading={loadingPlatforms}
          error={errorPlatforms}
          onExpand={() => handleChartDrillDown('platform', { type: 'platform' })}
        >
          <PlatformDistributionChart
            data={platformDistribution}
            height={300}
            chartType="pie"
            onPlatformClick={(platform) => handleChartDrillDown('platform', { platform })}
          />
        </ChartContainer>

        {/* Keyword Performance */}
        <ChartContainer
          title="Top Keyword Performance"
          subtitle="Most mentioned keywords and their sentiment"
          icon={<HashtagIcon className="h-5 w-5" />}
          loading={loadingKeywords}
          error={errorKeywords}
          onExpand={() => handleChartDrillDown('keyword', { type: 'keyword' })}
        >
          <KeywordPerformanceChart
            data={keywordPerformance}
            height={300}
            metric="mentions"
            maxKeywords={10}
            onKeywordClick={(keyword) => handleChartDrillDown('keyword', { keyword })}
          />
        </ChartContainer>
      </div>

      {/* Full-width charts */}
      <div className="space-y-6">
        {/* Detailed Sentiment Analysis */}
        <ChartContainer
          title="Detailed Sentiment Analysis"
          subtitle="Comprehensive view of sentiment patterns"
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          loading={loadingTrends}
          error={errorTrends}
          fullWidth
        >
          <SentimentTrendChart
            data={sentimentTrends}
            height={400}
            showLegend={true}
            onDataPointClick={(data) => handleChartDrillDown('sentiment', data)}
          />
        </ChartContainer>

        {/* Keyword Performance Scatter */}
        <ChartContainer
          title="Keyword Performance Analysis"
          subtitle="Engagement vs sentiment for all keywords"
          icon={<HashtagIcon className="h-5 w-5" />}
          loading={loadingKeywords}
          error={errorKeywords}
          fullWidth
        >
          <KeywordPerformanceChart
            data={keywordPerformance}
            height={400}
            chartType="scatter"
            maxKeywords={50}
            onKeywordClick={(keyword) => handleChartDrillDown('keyword', { keyword })}
          />
        </ChartContainer>
      </div>
    </div>
  )
}