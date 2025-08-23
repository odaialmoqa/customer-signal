'use client'

import { useState } from 'react'
import { useConversations } from '@/lib/hooks/useConversations'

interface ConversationSearchProps {
  tenantId: string
}

export function ConversationSearch({ tenantId }: ConversationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedSentiments, setSelectedSentiments] = useState<('positive' | 'negative' | 'neutral')[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const {
    conversations,
    loading,
    error,
    totalCount,
    searchConversations,
  } = useConversations({
    tenantId,
    autoFetch: false,
  })

  const handleSearch = async () => {
    await searchConversations({
      query: searchQuery || undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      sentiments: selectedSentiments.length > 0 ? selectedSentiments : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 50,
    })
  }

  const platforms = [
    'twitter', 'reddit', 'linkedin', 'facebook', 'instagram', 'tiktok',
    'youtube', 'yelp', 'google_reviews', 'trustpilot', 'g2', 'capterra',
    'stackoverflow', 'quora', 'news', 'blog', 'forum', 'other'
  ]

  const sentiments = ['positive', 'negative', 'neutral'] as const

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Search Conversations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Query
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter keywords to search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Platform Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <label key={platform} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlatforms([...selectedPlatforms, platform])
                    } else {
                      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {platform.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sentiment Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sentiment
          </label>
          <div className="flex gap-4">
            {sentiments.map((sentiment) => (
              <label key={sentiment} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedSentiments.includes(sentiment)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSentiments([...selectedSentiments, sentiment])
                    } else {
                      setSelectedSentiments(selectedSentiments.filter(s => s !== sentiment))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {sentiment}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Conversations'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Search Results ({totalCount} conversations)
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Searching conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No conversations found. Try adjusting your search criteria.
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {conversation.platform}
                      </span>
                      {conversation.sentiment && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          conversation.sentiment === 'positive' 
                            ? 'bg-green-100 text-green-800'
                            : conversation.sentiment === 'negative'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {conversation.sentiment}
                        </span>
                      )}
                      {conversation.author && (
                        <span className="text-sm text-gray-600">
                          by {conversation.author}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-900 mb-2">{conversation.content}</p>
                    
                    {conversation.keywords && conversation.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {conversation.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    {conversation.tags && conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conversation.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-right">
                    {conversation.timestamp && (
                      <p className="text-sm text-gray-500">
                        {new Date(conversation.timestamp).toLocaleDateString()}
                      </p>
                    )}
                    {conversation.url && (
                      <a
                        href={conversation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Original
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}