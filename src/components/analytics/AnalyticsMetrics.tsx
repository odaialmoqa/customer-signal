'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/services/analytics'
import { 
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  MinusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface AnalyticsMetricsProps {
  metrics: DashboardMetrics | null
  loading?: boolean
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'stable'
    label: string
  }
  icon: React.ReactNode
  color: 'blue' | 'green' | 'red' | 'gray'
  loading?: boolean
}

function MetricCard({ title, value, change, icon, color, loading }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }

  const TrendIcon = change?.trend === 'up' ? ArrowTrendingUpIcon : 
                   change?.trend === 'down' ? ArrowTrendingDownIcon : 
                   MinusIcon

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`p-3 rounded-md ${colorClasses[color]} animate-pulse`}>
                {icon}
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </dd>
              {change && (
                <dd className="flex items-center text-sm">
                  <TrendIcon className={`h-4 w-4 mr-1 ${trendColors[change.trend]}`} />
                  <span className={`font-medium ${trendColors[change.trend]}`}>
                    {change.value > 0 ? '+' : ''}{change.value}%
                  </span>
                  <span className="text-gray-500 ml-1">
                    {change.label}
                  </span>
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AnalyticsMetrics({ metrics, loading }: AnalyticsMetricsProps) {
  const calculateSentimentPercentage = (count: number, total: number): number => {
    return total > 0 ? (count / total) * 100 : 0
  }

  const getSentimentTrend = (current: number, previous: number): { value: number; trend: 'up' | 'down' | 'stable' } => {
    if (previous === 0) return { value: 0, trend: 'stable' }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.round(change),
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
    }
  }

  const totalConversations = metrics?.totalConversations || 0
  const sentimentDistribution = metrics?.sentimentDistribution || { positive: 0, negative: 0, neutral: 0 }
  
  const positivePercentage = calculateSentimentPercentage(sentimentDistribution.positive, totalConversations)
  const negativePercentage = calculateSentimentPercentage(sentimentDistribution.negative, totalConversations)
  const neutralPercentage = calculateSentimentPercentage(sentimentDistribution.neutral, totalConversations)

  // Calculate top platform
  const topPlatform = metrics?.platformDistribution?.[0]
  const topPlatformName = topPlatform ? topPlatform.platform.charAt(0).toUpperCase() + topPlatform.platform.slice(1) : 'N/A'
  const topPlatformCount = topPlatform?.count || 0

  // Calculate emerging themes count
  const emergingThemesCount = metrics?.emergingThemes?.length || 0

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Conversations */}
      <MetricCard
        title="Total Conversations"
        value={totalConversations}
        change={{
          value: 12, // This would come from comparing with previous period
          trend: 'up',
          label: 'vs last period'
        }}
        icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
        color="blue"
        loading={loading}
      />

      {/* Positive Sentiment */}
      <MetricCard
        title="Positive Sentiment"
        value={`${positivePercentage.toFixed(1)}%`}
        change={{
          value: 5, // This would come from comparing with previous period
          trend: 'up',
          label: 'vs last period'
        }}
        icon={<FaceSmileIcon className="h-6 w-6" />}
        color="green"
        loading={loading}
      />

      {/* Negative Sentiment */}
      <MetricCard
        title="Negative Sentiment"
        value={`${negativePercentage.toFixed(1)}%`}
        change={{
          value: -3, // This would come from comparing with previous period
          trend: 'down',
          label: 'vs last period'
        }}
        icon={<FaceFrownIcon className="h-6 w-6" />}
        color="red"
        loading={loading}
      />

      {/* Top Platform */}
      <MetricCard
        title="Top Platform"
        value={`${topPlatformName} (${topPlatformCount})`}
        icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
        color="gray"
        loading={loading}
      />
    </div>
  )
}