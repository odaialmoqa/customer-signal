'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts'
import { KeywordPerformance } from '@/lib/services/analytics'

interface KeywordPerformanceChartProps {
  data: KeywordPerformance[]
  height?: number
  chartType?: 'bar' | 'scatter'
  metric?: 'mentions' | 'sentiment' | 'engagement'
  maxKeywords?: number
  interactive?: boolean
  onKeywordClick?: (keyword: string) => void
}

interface ChartDataPoint {
  keyword: string
  totalMentions: number
  averageSentiment: number
  engagementScore: number
  platformCount: number
  recentTrend: 'up' | 'down' | 'stable'
  sentimentColor: string
  trendColor: string
}

const getSentimentColor = (sentiment: number): string => {
  if (sentiment > 0.2) return '#10b981' // Green for positive
  if (sentiment < -0.2) return '#ef4444' // Red for negative
  return '#6b7280' // Gray for neutral
}

const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return '#10b981'
    case 'down': return '#ef4444'
    case 'stable': return '#6b7280'
  }
}

export function KeywordPerformanceChart({
  data,
  height = 400,
  chartType = 'bar',
  metric = 'mentions',
  maxKeywords = 20,
  interactive = true,
  onKeywordClick
}: KeywordPerformanceChartProps) {
  const chartData = useMemo(() => {
    const sortedData = [...data]
      .sort((a, b) => {
        switch (metric) {
          case 'mentions':
            return b.totalMentions - a.totalMentions
          case 'sentiment':
            return b.averageSentiment - a.averageSentiment
          case 'engagement':
            return b.engagementScore - a.engagementScore
          default:
            return b.totalMentions - a.totalMentions
        }
      })
      .slice(0, maxKeywords)

    return sortedData.map((item): ChartDataPoint => ({
      keyword: item.keyword.length > 15 ? `${item.keyword.substring(0, 15)}...` : item.keyword,
      totalMentions: item.totalMentions,
      averageSentiment: item.averageSentiment,
      engagementScore: item.engagementScore,
      platformCount: item.platforms.length,
      recentTrend: item.recentTrend,
      sentimentColor: getSentimentColor(item.averageSentiment),
      trendColor: getTrendColor(item.recentTrend)
    }))
  }, [data, metric, maxKeywords])

  const getDataKey = () => {
    switch (metric) {
      case 'mentions':
        return 'totalMentions'
      case 'sentiment':
        return 'averageSentiment'
      case 'engagement':
        return 'engagementScore'
      default:
        return 'totalMentions'
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'mentions':
        return 'Total Mentions'
      case 'sentiment':
        return 'Average Sentiment'
      case 'engagement':
        return 'Engagement Score'
      default:
        return 'Total Mentions'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {data.keyword}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Total Mentions</span>
              <span className="font-medium">{data.totalMentions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Sentiment</span>
              <span 
                className="font-medium"
                style={{ color: data.sentimentColor }}
              >
                {data.averageSentiment.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Engagement Score</span>
              <span className="font-medium">{data.engagementScore.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Platforms</span>
              <span className="font-medium">{data.platformCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recent Trend</span>
              <span 
                className="font-medium capitalize flex items-center"
                style={{ color: data.trendColor }}
              >
                {data.recentTrend === 'up' && '↗'}
                {data.recentTrend === 'down' && '↘'}
                {data.recentTrend === 'stable' && '→'}
                <span className="ml-1">{data.recentTrend}</span>
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const handleClick = (data: any) => {
    if (interactive && onKeywordClick) {
      onKeywordClick(data.keyword)
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No keyword data available</p>
          <p className="text-sm">Try adjusting your filters or date range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'bar' ? (
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="keyword"
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              label={{ 
                value: getMetricLabel(), 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={getDataKey()}
              name={getMetricLabel()}
              fill="#3b82f6"
            >
              {chartData.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  fill={metric === 'sentiment' ? entry.sentimentColor : '#3b82f6'}
                />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <ScatterChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="totalMentions" 
              name="Total Mentions"
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              type="number" 
              dataKey="averageSentiment" 
              name="Average Sentiment"
              stroke="#6b7280"
              fontSize={12}
            />
            <ZAxis 
              type="number" 
              dataKey="engagementScore" 
              range={[50, 400]} 
              name="Engagement Score"
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Keywords" 
              data={chartData} 
              fill="#3b82f6"
            >
              {chartData.map((entry, index) => (
                <Scatter
                  key={`scatter-${index}`}
                  fill={entry.sentimentColor}
                />
              ))}
            </Scatter>
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}