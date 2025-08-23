'use client'

import React, { useState, useEffect } from 'react'
import { AnalyticsFilters as Filters } from '@/lib/services/analytics'
import { CalendarIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface AnalyticsFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  loading?: boolean
}

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 }
]

const PLATFORM_OPTIONS = [
  'reddit',
  'twitter', 
  'linkedin',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'news',
  'forums',
  'reviews',
  'blogs'
]

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-800' },
  { value: 'negative', label: 'Negative', color: 'bg-red-100 text-red-800' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800' }
]

const INTERVAL_OPTIONS = [
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' }
]

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  loading = false
}: AnalyticsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localFilters, setLocalFilters] = useState<Filters>(filters)
  const [keywordInput, setKeywordInput] = useState('')

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handlePresetRange = (days: number) => {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))
    
    const newFilters = {
      ...localFilters,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newFilters = {
      ...localFilters,
      [field]: value ? new Date(value).toISOString() : undefined
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handlePlatformToggle = (platform: string) => {
    const currentPlatforms = localFilters.platforms || []
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform]
    
    const newFilters = {
      ...localFilters,
      platforms: newPlatforms.length > 0 ? newPlatforms : undefined
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleSentimentToggle = (sentiment: 'positive' | 'negative' | 'neutral') => {
    const currentSentiments = localFilters.sentiments || []
    const newSentiments = currentSentiments.includes(sentiment)
      ? currentSentiments.filter(s => s !== sentiment)
      : [...currentSentiments, sentiment]
    
    const newFilters = {
      ...localFilters,
      sentiments: newSentiments.length > 0 ? newSentiments : undefined
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleKeywordAdd = () => {
    if (keywordInput.trim()) {
      const currentKeywords = localFilters.keywords || []
      const newKeywords = [...currentKeywords, keywordInput.trim()]
      
      const newFilters = {
        ...localFilters,
        keywords: newKeywords
      }
      
      setLocalFilters(newFilters)
      onFiltersChange(newFilters)
      setKeywordInput('')
    }
  }

  const handleKeywordRemove = (keyword: string) => {
    const currentKeywords = localFilters.keywords || []
    const newKeywords = currentKeywords.filter(k => k !== keyword)
    
    const newFilters = {
      ...localFilters,
      keywords: newKeywords.length > 0 ? newKeywords : undefined
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleIntervalChange = (intervalType: 'hour' | 'day' | 'week' | 'month') => {
    const newFilters = {
      ...localFilters,
      intervalType
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const newFilters: Filters = {}
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
    setKeywordInput('')
  }

  const hasActiveFilters = !!(
    localFilters.startDate ||
    localFilters.endDate ||
    localFilters.keywords?.length ||
    localFilters.platforms?.length ||
    localFilters.sentiments?.length
  )

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Date Ranges
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_RANGES.map(range => (
            <button
              key={range.days}
              onClick={() => handlePresetRange(range.days)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(localFilters.startDate)}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              disabled={loading}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(localFilters.endDate)}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              disabled={loading}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKeywordAdd()}
                placeholder="Add keyword..."
                disabled={loading}
                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleKeywordAdd}
                disabled={loading || !keywordInput.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {localFilters.keywords && localFilters.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {keyword}
                    <button
                      onClick={() => handleKeywordRemove(keyword)}
                      disabled={loading}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none disabled:opacity-50"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(platform => (
                <button
                  key={platform}
                  onClick={() => handlePlatformToggle(platform)}
                  disabled={loading}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                    localFilters.platforms?.includes(platform)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sentiments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sentiment
            </label>
            <div className="flex flex-wrap gap-2">
              {SENTIMENT_OPTIONS.map(sentiment => (
                <button
                  key={sentiment.value}
                  onClick={() => handleSentimentToggle(sentiment.value as 'positive' | 'negative' | 'neutral')}
                  disabled={loading}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                    localFilters.sentiments?.includes(sentiment.value as 'positive' | 'negative' | 'neutral')
                      ? sentiment.color + ' border-current'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {sentiment.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Interval
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map(interval => (
                <button
                  key={interval.value}
                  onClick={() => handleIntervalChange(interval.value as 'hour' | 'day' | 'week' | 'month')}
                  disabled={loading}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 ${
                    localFilters.intervalType === interval.value
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}