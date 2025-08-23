'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SearchFilters } from '@/lib/services/conversation'
import { 
  CalendarIcon, 
  FunnelIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
}

interface FilterPreset {
  id: string
  name: string
  filters: Partial<SearchFilters>
  description: string
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: (filters: SearchFilters) => void
  loading?: boolean
  tenantId: string
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, filters: SearchFilters) => void
  onDeleteSavedSearch?: (id: string) => void
  onLoadSavedSearch?: (search: SavedSearch) => void
}

const PRESET_RANGES = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 }
]

const PLATFORM_OPTIONS = [
  { value: 'reddit', label: 'Reddit', color: 'bg-orange-100 text-orange-800' },
  { value: 'twitter', label: 'Twitter/X', color: 'bg-blue-100 text-blue-800' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-800' },
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-100 text-blue-800' },
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-800' },
  { value: 'youtube', label: 'YouTube', color: 'bg-red-100 text-red-800' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-gray-100 text-gray-800' },
  { value: 'yelp', label: 'Yelp', color: 'bg-red-100 text-red-800' },
  { value: 'google_reviews', label: 'Google Reviews', color: 'bg-green-100 text-green-800' },
  { value: 'trustpilot', label: 'Trustpilot', color: 'bg-green-100 text-green-800' },
  { value: 'g2', label: 'G2', color: 'bg-orange-100 text-orange-800' },
  { value: 'capterra', label: 'Capterra', color: 'bg-blue-100 text-blue-800' },
  { value: 'stackoverflow', label: 'Stack Overflow', color: 'bg-orange-100 text-orange-800' },
  { value: 'quora', label: 'Quora', color: 'bg-red-100 text-red-800' },
  { value: 'news', label: 'News Sites', color: 'bg-gray-100 text-gray-800' },
  { value: 'blog', label: 'Blogs', color: 'bg-purple-100 text-purple-800' },
  { value: 'forum', label: 'Forums', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
]

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-800' },
  { value: 'negative', label: 'Negative', color: 'bg-red-100 text-red-800' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800' }
]

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'recent-negative',
    name: 'Recent Negative Feedback',
    description: 'Last 7 days of negative sentiment',
    filters: {
      sentiments: ['negative'],
      startDate: subDays(new Date(), 7).toISOString(),
      endDate: new Date().toISOString()
    }
  },
  {
    id: 'social-media-buzz',
    name: 'Social Media Buzz',
    description: 'All social media platforms, last 30 days',
    filters: {
      platforms: ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'],
      startDate: subDays(new Date(), 30).toISOString(),
      endDate: new Date().toISOString()
    }
  },
  {
    id: 'review-sites',
    name: 'Review Sites',
    description: 'All review platforms',
    filters: {
      platforms: ['yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra']
    }
  },
  {
    id: 'positive-mentions',
    name: 'Positive Mentions',
    description: 'All positive feedback, last 30 days',
    filters: {
      sentiments: ['positive'],
      startDate: subDays(new Date(), 30).toISOString(),
      endDate: new Date().toISOString()
    }
  }
]

export function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  loading = false,
  tenantId,
  savedSearches = [],
  onSaveSearch,
  onDeleteSavedSearch,
  onLoadSavedSearch
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  const [searchQuery, setSearchQuery] = useState(filters.query || '')
  const [keywordInput, setKeywordInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [autocompleteKeywords, setAutocompleteKeywords] = useState<string[]>([])
  const [autocompleteTags, setAutocompleteTags] = useState<string[]>([])

  useEffect(() => {
    setLocalFilters(filters)
    setSearchQuery(filters.query || '')
  }, [filters])

  // Debounced search query update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== localFilters.query) {
        const newFilters = { ...localFilters, query: searchQuery || undefined }
        setLocalFilters(newFilters)
        onFiltersChange(newFilters)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

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

  const handleTagAdd = () => {
    if (tagInput.trim()) {
      const currentTags = localFilters.tags || []
      const newTags = [...currentTags, tagInput.trim()]
      
      const newFilters = {
        ...localFilters,
        tags: newTags
      }
      
      setLocalFilters(newFilters)
      onFiltersChange(newFilters)
      setTagInput('')
    }
  }

  const handleTagRemove = (tag: string) => {
    const currentTags = localFilters.tags || []
    const newTags = currentTags.filter(t => t !== tag)
    
    const newFilters = {
      ...localFilters,
      tags: newTags.length > 0 ? newTags : undefined
    }
    
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const applyFilterPreset = (preset: FilterPreset) => {
    const newFilters = { ...localFilters, ...preset.filters }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const newFilters: SearchFilters = {}
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
    setSearchQuery('')
    setKeywordInput('')
    setTagInput('')
  }

  const handleSaveSearch = () => {
    if (saveSearchName.trim() && onSaveSearch) {
      onSaveSearch(saveSearchName.trim(), localFilters)
      setSaveSearchName('')
      setShowSaveDialog(false)
    }
  }

  const handleLoadSavedSearch = (search: SavedSearch) => {
    if (onLoadSavedSearch) {
      onLoadSavedSearch(search)
    }
    setShowSavedSearches(false)
  }

  const handleSearch = () => {
    onSearch(localFilters)
  }

  const hasActiveFilters = !!(
    localFilters.query ||
    localFilters.startDate ||
    localFilters.endDate ||
    localFilters.keywords?.length ||
    localFilters.tags?.length ||
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Search & Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {savedSearches.length > 0 && (
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BookmarkIcon className="h-4 w-4 mr-1" />
              Saved ({savedSearches.length})
            </button>
          )}
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
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Show more
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Query */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter keywords to search conversations..."
              disabled={loading}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Saved Searches */}
        {showSavedSearches && savedSearches.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Searches</h4>
            <div className="space-y-2">
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center justify-between bg-white rounded p-2">
                  <div>
                    <button
                      onClick={() => handleLoadSavedSearch(search)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {search.name}
                    </button>
                    <p className="text-xs text-gray-500">
                      Saved {format(new Date(search.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {onDeleteSavedSearch && (
                    <button
                      onClick={() => onDeleteSavedSearch(search.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Filters
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FILTER_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyFilterPreset(preset)}
                disabled={loading}
                className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Date Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
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

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formatDateForInput(localFilters.startDate)}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formatDateForInput(localFilters.endDate)}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
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
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()}
                  placeholder="Add tag..."
                  disabled={loading}
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleTagAdd}
                  disabled={loading || !tagInput.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {localFilters.tags && localFilters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {localFilters.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      #{tag}
                      <button
                        onClick={() => handleTagRemove(tag)}
                        disabled={loading}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-600 focus:outline-none disabled:opacity-50"
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {PLATFORM_OPTIONS.map(platform => (
                  <button
                    key={platform.value}
                    onClick={() => handlePlatformToggle(platform.value)}
                    disabled={loading}
                    className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                      localFilters.platforms?.includes(platform.value)
                        ? platform.color + ' border-current'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {platform.label}
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
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
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
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </button>
            
            {onSaveSearch && hasActiveFilters && (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <BookmarkIcon className="h-4 w-4 mr-2" />
                Save Search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Save Search</h3>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter search name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}