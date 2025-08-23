'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { TrendData } from '@/lib/services/analytics'
import { format, parseISO } from 'date-fns'

interface SentimentTrendChartProps {
  data: TrendData[]
  height?: number
  showLegend?: boolean
  interactive?: boolean
  onDataPointClick?: (data: any) => void
}

interface ChartDataPoint {
  date: string
  positive: number
  negative: number
  neutral: number
  total: number
  sentimentScore: number
}

export function SentimentTrendChart({
  data,
  height = 400,
  showLegend = true,
  interactive = true,
  onDataPointClick
}: SentimentTrendChartProps) {
  const chartData = useMemo(() => {
    // Group data by date and aggregate sentiment counts
    const dateGroups: Record<string, {
      positive: number
      negative: number
      neutral: number
      total: number
      sentimentSum: number
      count: number
    }> = {}

    data.forEach(item => {
      const date = item.timeBucket.split('T')[0] // Get date part
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          sentimentSum: 0,
          count: 0
        }
      }

      dateGroups[date].positive += item.positiveCount
      dateGroups[date].negative += item.negativeCount
      dateGroups[date].neutral += item.neutralCount
      dateGroups[date].total += item.totalCount
      dateGroups[date].sentimentSum += item.sentimentScore * item.totalCount
      dateGroups[date].count += item.totalCount
    })

    return Object.entries(dateGroups)
      .map(([date, counts]): ChartDataPoint => ({
        date,
        positive: counts.positive,
        negative: counts.negative,
        neutral: counts.neutral,
        total: counts.total,
        sentimentScore: counts.count > 0 ? counts.sentimentSum / counts.count : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

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
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                Positive
              </span>
              <span className="font-medium">{data.positive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                Negative
              </span>
              <span className="font-medium">{data.negative}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                Neutral
              </span>
              <span className="font-medium">{data.neutral}</span>
            </div>
            <div className="border-t pt-1 mt-2">
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{data.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Sentiment Score</span>
                <span>{data.sentimentScore.toFixed(2)}</span>
              </div>
            </div>
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
          <p className="text-lg font-medium">No sentiment data available</p>
          <p className="text-sm">Try adjusting your filters or date range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
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
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          )}
          <Area
            type="monotone"
            dataKey="positive"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            name="Positive"
          />
          <Area
            type="monotone"
            dataKey="neutral"
            stackId="1"
            stroke="#6b7280"
            fill="#6b7280"
            fillOpacity={0.6}
            name="Neutral"
          />
          <Area
            type="monotone"
            dataKey="negative"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Negative"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}