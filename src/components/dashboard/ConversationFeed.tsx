'use client'

import { useState, useEffect } from 'react'
import { useConversations } from '@/lib/hooks/useConversations'
import { useTenant } from '@/lib/hooks/useTenant'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { 
  ChatBubbleLeftIcon,
  HeartIcon,
  ShareIcon,
  EyeIcon,
  TagIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

interface ConversationFeedProps {
  limit?: number
  showSearch?: boolean
  className?: string
}

interface ConversationCardProps {
  conversation: ConversationRow
  onTagAdd?: (conversationId: string, tags: string[]) => void
}

function ConversationCard({ conversation, onTagAdd }: ConversationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState('')

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      case 'neutral':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getPlatformIcon = (platform: string) => {
    // Return appropriate icon based on platform
    return <ChatBubbleLeftIcon className="h-4 w-4" />
  }

  const handleAddTag = () => {
    if (newTag.trim() && onTagAdd) {
      onTagAdd(conversation.id, [newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
    }
  }

  const engagementMetrics = conversation.engagement_metrics as any || {}

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getPlatformIcon(conversation.platform)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {conversation.author || 'Anonymous'}
              </span>
              <span className="text-sm text-gray-500">on</span>
              <span className="text-sm font-medium text-blue-600 capitalize">
                {conversation.platform}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">
                {conversation.timestamp 
                  ? formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true })
                  : formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })
                }
              </span>
              {conversation.sentiment && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(conversation.sentiment)}`}>
                  {conversation.sentiment}
                  {conversation.sentiment_confidence && (
                    <span className="ml-1">
                      ({Math.round(conversation.sentiment_confidence * 100)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        {conversation.url && (
          <a
            href={conversation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <LinkIcon className="h-5 w-5" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className={`text-gray-900 ${!isExpanded && conversation.content.length > 200 ? 'line-clamp-3' : ''}`}>
          {conversation.content}
        </p>
        {conversation.content.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Keywords */}
      {conversation.keywords && conversation.keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {conversation.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {conversation.tags && conversation.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
            >
              <TagIcon className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {showTagInput ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="text-xs border border-gray-300 rounded px-2 py-1 w-20"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowTagInput(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400"
            >
              <TagIcon className="h-3 w-3 mr-1" />
              Add tag
            </button>
          )}
        </div>
      </div>

      {/* Engagement metrics */}
      {(engagementMetrics.likes || engagementMetrics.shares || engagementMetrics.views) && (
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {engagementMetrics.likes && (
            <div className="flex items-center space-x-1">
              <HeartSolidIcon className="h-4 w-4 text-red-500" />
              <span>{engagementMetrics.likes}</span>
            </div>
          )}
          {engagementMetrics.shares && (
            <div className="flex items-center space-x-1">
              <ShareIcon className="h-4 w-4" />
              <span>{engagementMetrics.shares}</span>
            </div>
          )}
          {engagementMetrics.views && (
            <div className="flex items-center space-x-1">
              <EyeIcon className="h-4 w-4" />
              <span>{engagementMetrics.views}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConversationFeed({ 
  limit = 20, 
  showSearch = true, 
  className = '' 
}: ConversationFeedProps) {
  const { tenant } = useTenant()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([])
  const [realtimeConversations, setRealtimeConversations] = useState<ConversationRow[]>([])

  const {
    conversations,
    loading,
    error,
    totalCount,
    searchConversations,
    addTags,
    refresh
  } = useConversations({
    tenantId: tenant?.id || '',
    filters: {
      query: searchQuery || undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      sentiments: selectedSentiments.length > 0 ? selectedSentiments as any : undefined,
      limit
    },
    autoFetch: true
  })

  // Set up real-time subscription
  useEffect(() => {
    if (!tenant?.id) return

    const supabase = createClient()
    
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload) => {
          const newConversation = payload.new as ConversationRow
          setRealtimeConversations(prev => [newConversation, ...prev.slice(0, 4)]) // Keep only 5 most recent
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant?.id])

  const handleSearch = () => {
    searchConversations({
      query: searchQuery || undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      sentiments: selectedSentiments.length > 0 ? selectedSentiments as any : undefined,
      limit
    })
  }

  const handleTagAdd = async (conversationId: string, tags: string[]) => {
    await addTags(conversationId, tags)
  }

  const allConversations = [...realtimeConversations, ...conversations]
  const uniqueConversations = allConversations.filter((conv, index, self) => 
    index === self.findIndex(c => c.id === conv.id)
  )

  if (!tenant?.id) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Please log in to view conversations.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Search and filters */}
      {showSearch && (
        <div className="mb-6 space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {['positive', 'negative', 'neutral'].map(sentiment => (
              <button
                key={sentiment}
                onClick={() => {
                  setSelectedSentiments(prev => 
                    prev.includes(sentiment) 
                      ? prev.filter(s => s !== sentiment)
                      : [...prev, sentiment]
                  )
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedSentiments.includes(sentiment)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sentiment}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      {realtimeConversations.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            {realtimeConversations.length} new conversation{realtimeConversations.length !== 1 ? 's' : ''} received
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading conversations...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-red-600 hover:text-red-700 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Conversations list */}
      {!loading && uniqueConversations.length === 0 ? (
        <div className="text-center py-12">
          <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-500">
            {searchQuery || selectedPlatforms.length > 0 || selectedSentiments.length > 0
              ? 'Try adjusting your search filters.'
              : 'Start monitoring keywords to see conversations here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {uniqueConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onTagAdd={handleTagAdd}
            />
          ))}
          
          {/* Load more indicator */}
          {totalCount > uniqueConversations.length && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                Showing {uniqueConversations.length} of {totalCount} conversations
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}