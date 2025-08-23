'use client'

import React, { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { PlatformDistribution } from '@/lib/services/analytics'

interface PlatformDistributionChartProps {
  data: PlatformDistribution[]
  height?: number
  chartType?: 'pie' | 'bar'
  showSentimentBreakdown?: boolean
  interactive?: boolean
  onPlatformClick?: (platform: string) => void
}

const PLATFORM_COLORS = {
  reddit: '#ff4500',
  twitter: '#1da1f2',
  linkedin: '#0077b5',
  facebook: '#1877f2',
  instagram: '#e4405f',
  youtube: '#ff0000',
  tiktok: '#000000',
  news: '#4b5563',
  forums: '#8b5cf6',
  reviews: '#f59e0b',
  blogs: '#10b981',
  other: '#6b7280'
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280'
}

export function PlatformDistributionChart({
  data,
  height = 400,
  chartType = 'pie',
  showSentimentBreakdown = false,
  interactive = true,
  onPlatformClick
}: PlatformDistributionChartProps) {
  const chartData = useMemo(() => {
    if (showSentimentBreakdown) {
      // Flatten data to show sentiment breakdown per platform
      return data.flatMap(platform => [
        {
          platform: platform.platform,
          sentiment: 'positive',
          count: platform.sentimentBreakdown.positive,
          percentage: platform.count > 0 ? (platform.sentimentBreakdown.positive / platform.count) * 100 : 0,
          color: SENTIMENT_COLORS.positive
        },
        {
          platform: platform.platform,
          sentiment: 'negative', 
          count: platform.sentimentBreakdown.negative,
          percentage: platform.count > 0 ? (platform.sentimentBreakdown.negative / platform.count) * 100 : 0,
          color: SENTIMENT_COLORS.negative
        },
        {
          platform: platform.platform,
          sentiment: 'neutral',
          count: platform.sentimentBreakdown.neutral,
          percentage: platform.count > 0 ? (platform.sentimentBreakdown.neutral / platform.count) * 100 : 0,
          color: SENTIMENT_COLORS.neutral
        }
      ]).filter(item => item.count > 0)
    }

    return data.map(platform => ({
      platform: platform.platform,
      count: platform.count,
      percentage: platform.percentage,
      color: PLATFORM_COLORS[platform.platform as keyof typeof PLATFORM_COLORS] || '#6b7280',
      sentimentBreakdown: platform.sentimentBreakdown
    }))
  }, [data, showSentimentBreakdown])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      if (showSentimentBreakdown) {
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-medium text-gray-900 mb-2 capitalize">
              {data.platform} - {data.sentiment}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Count</span>
                <span className="font-medium">{data.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Percentage</span>
                <span className="font-medium">{data.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2 capitalize">
            {data.platform}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Conversations</span>
              <span className="font-medium">{data.count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Percentage</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-600 mb-1">Sentiment Breakdown:</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Positive
                  </span>
                  <span>{data.sentimentBreakdown?.positive || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                    Negative
                  </span>
                  <span>{data.sentimentBreakdown?.negative || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                    Neutral
                  </span>
                  <span>{data.sentimentBreakdown?.neutral || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const handleClick = (data: any) => {
    if (interactive && onPlatformClick) {
      onPlatformClick(data.platform)
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No platform data available</p>
          <p className="text-sm">Try adjusting your filters or date range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ platform, percentage, sentiment }) => 
                showSentimentBreakdown 
                  ? `${platform} (${sentiment}): ${percentage.toFixed(1)}%`
                  : `${platform}: ${percentage.toFixed(1)}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
              onClick={handleClick}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        ) : (
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={showSentimentBreakdown ? "sentiment" : "platform"}
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              name="Conversations"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}