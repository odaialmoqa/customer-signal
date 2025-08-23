'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import { ConversationService } from '@/lib/services/conversation'
import { 
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}

function StatCard({ title, value, change, changeType, icon: Icon, loading }: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <div className="text-2xl font-semibold text-gray-900">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  {change && (
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor()}`}>
                      {change}
                    </div>
                  )}
                </>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

interface DashboardStatsProps {
  className?: string
}

export default function DashboardStats({ className = '' }: DashboardStatsProps) {
  const { tenant } = useTenant()
  const [stats, setStats] = useState({
    totalConversations: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    platformDistribution: {} as Record<string, number>,
    dailyCounts: {} as Record<string, number>
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const conversationService = new ConversationService()

  useEffect(() => {
    if (!tenant?.id) return

    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get stats for the last 30 days
        const endDate = new Date().toISOString()
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const conversationStats = await conversationService.getConversationStats(
          tenant.id,
          startDate,
          endDate
        )

        setStats(conversationStats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [tenant?.id])

  // Calculate sentiment percentages
  const totalSentimentCount = stats.positiveCount + stats.negativeCount + stats.neutralCount
  const positivePercentage = totalSentimentCount > 0 
    ? Math.round((stats.positiveCount / totalSentimentCount) * 100) 
    : 0
  const negativePercentage = totalSentimentCount > 0 
    ? Math.round((stats.negativeCount / totalSentimentCount) * 100) 
    : 0

  // Calculate trend from daily counts
  const dailyCountsArray = Object.entries(stats.dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, count]) => count)
  
  const recentTrend = dailyCountsArray.length >= 2 
    ? dailyCountsArray[dailyCountsArray.length - 1] - dailyCountsArray[dailyCountsArray.length - 2]
    : 0

  const trendPercentage = dailyCountsArray.length >= 2 && dailyCountsArray[dailyCountsArray.length - 2] > 0
    ? Math.round((recentTrend / dailyCountsArray[dailyCountsArray.length - 2]) * 100)
    : 0

  if (!tenant?.id) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Please log in to view statistics.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations}
          change={trendPercentage !== 0 ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage}%` : undefined}
          changeType={trendPercentage > 0 ? 'positive' : trendPercentage < 0 ? 'negative' : 'neutral'}
          icon={ChatBubbleLeftRightIcon}
          loading={loading}
        />
        
        <StatCard
          title="Positive Sentiment"
          value={`${positivePercentage}%`}
          change={`${stats.positiveCount} conversations`}
          changeType="positive"
          icon={HeartIcon}
          loading={loading}
        />
        
        <StatCard
          title="Negative Sentiment"
          value={`${negativePercentage}%`}
          change={`${stats.negativeCount} conversations`}
          changeType="negative"
          icon={ExclamationTriangleIcon}
          loading={loading}
        />
        
        <StatCard
          title="Active Platforms"
          value={Object.keys(stats.platformDistribution).length}
          change={`${Object.values(stats.platformDistribution).reduce((a, b) => a + b, 0)} total mentions`}
          changeType="neutral"
          icon={ArrowTrendingUpIcon}
          loading={loading}
        />
      </div>

      {/* Platform distribution */}
      {!loading && Object.keys(stats.platformDistribution).length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats.platformDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([platform, count]) => {
                const percentage = Math.round((count / stats.totalConversations) * 100)
                return (
                  <div key={platform} className="flex items-center">
                    <div className="flex-1 flex items-center">
                      <span className="text-sm font-medium text-gray-900 capitalize w-20">
                        {platform}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Recent activity chart placeholder */}
      {!loading && dailyCountsArray.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity (Last 7 Days)</h3>
          <div className="flex items-end space-x-2 h-32">
            {dailyCountsArray.slice(-7).map((count, index) => {
              const maxCount = Math.max(...dailyCountsArray.slice(-7))
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-blue-600 rounded-t w-full min-h-[4px]"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}