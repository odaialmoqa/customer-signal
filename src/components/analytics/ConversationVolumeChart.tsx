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
  LineChart,
  Line
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface ConversationVolumeChartProps {
  data: Array<{ date: string; value: number; breakdown?: Record<string, number> }>
  height?: number
  showBreakdown?: boolean
  chartType?: 'bar' | 'line'
  interactive?: boolean
  onDataPointClick?: (data: any) => void
}

interface ChartDataPoint {
  date: string
  total: number
  [platform: string]: number | string
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

export function ConversationVolumeChart({
  data,
  height = 400,
  showBreakdown = true,
  chartType = 'bar',
  interactive = true,
  onDataPointClick
}: ConversationVolumeChartProps) {
  const { chartData, platforms } = useMemo(() => {
    const platformSet = new Set<string>()
    
    const processedData = data.map(item => {
      const point: ChartDataPoint = {
        date: item.date,
        total: item.value
      }

      if (showBreakdown && item.breakdown) {
        Object.entries(item.breakdown).forEach(([platform, count]) => {
          platformSet.add(platform)
          point[platform] = count
        })
      }

      return point
    }).sort((a, b) => a.date.localeCompare(b.date))

    return {
      chartData: processedData,
      platforms: Array.from(platformSet).sort()
    }
  }, [data, showBreakdown])

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd')
    } catch {
      return dateStr
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {format(parseISO(label), 'MMM dd, yyyy')}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between font-medium border-b pb-1">
              <span>Total Conversations</span>
              <span>{data.total}</span>
            </div>
            {showBreakdown && platforms.map(platform => {
              const count = data[platform] as number
              if (count > 0) {
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="flex items-center capitalize">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#6b7280' }}
                      ></div>
                      {platform}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )
    }
    return null
  }

  const handleClick = (data: any) => {
    if (interactive && onDataPointClick) {
      onDataPointClick(data)
    }
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No conversation data available</p>
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
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {showBreakdown ? (
              platforms.map(platform => (
                <Bar
                  key={platform}
                  dataKey={platform}
                  stackId="platforms"
                  fill={PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#6b7280'}
                  name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                />
              ))
            ) : (
              <Bar
                dataKey="total"
                fill="#3b82f6"
                name="Total Conversations"
              />
            )}
          </BarChart>
        ) : (
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            onClick={handleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            
            {showBreakdown ? (
              platforms.map(platform => (
                <Line
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  stroke={PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#6b7280'}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="Total Conversations"
              />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}