'use client'

import React, { useState } from 'react'
import { Database } from '@/lib/types/database'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  EyeIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

interface SearchResultsProps {
  conversations: ConversationRow[]
  totalCount: number
  loading: boolean
  error: string | null
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onConversationClick?: (conversation: ConversationRow) => void
  onAddTag?: (conversationId: string, tag: string) => void
  showPagination?: boolean
}

interface ConversationCardProps {
  conversation: ConversationRow
  onConversationClick?: (conversation: ConversationRow) => void
  onAddTag?: (conversationId: string, tag: string) => void
}

function ConversationCard({ 
  conversation, 
  onConversationClick,
  onAddTag 
}: ConversationCardProps) {
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTag, setNewTag] = useState('')

  const handleAddTag = () => {
    if (newTag.trim() && onAddTag) {
      onAddTag(conversation.id, newTag.trim())
      setNewTag('')
      setShowAddTag(false)
    }
  }

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'neutral':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPlatformColor = (platform: string) => {
    const platformColors: Record<string, string> = {
      reddit: 'bg-orange-100 text-orange-800',
      twitter: 'bg-blue-100 text-blue-800',
      linkedin: 'bg-blue-100 text-blue-800',
      facebook: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      youtube: 'bg-red-100 text-red-800',
      tiktok: 'bg-gray-100 text-gray-800',
      yelp: 'bg-red-100 text-red-800',
      google_reviews: 'bg-green-100 text-green-800',
      trustpilot: 'bg-green-100 text-green-800',
      g2: 'bg-orange-100 text-orange-800',
      capterra: 'bg-blue-100 text-blue-800',
      stackoverflow: 'bg-orange-100 text-orange-800',
      quora: 'bg-red-100 text-red-800',
      news: 'bg-gray-100 text-gray-800',
      blog: 'bg-purple-100 text-purple-800',
      forum: 'bg-indigo-100 text-indigo-800'
    }
    return platformColors[platform] || 'bg-gray-100 text-gray-800'
  }

  const formatPlatformName = (platform: string) => {
    return platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(conversation.platform)}`}>
            {formatPlatformName(conversation.platform)}
          </span>
          
          {conversation.sentiment && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSentimentColor(conversation.sentiment)}`}>
              {conversation.sentiment}
            </span>
          )}

          {conversation.author && (
            <span className="inline-flex items-center text-xs text-gray-600">
              <UserIcon className="h-3 w-3 mr-1" />
              {conversation.author}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {conversation.timestamp && (
            <span className="inline-flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {format(new Date(conversation.timestamp), 'MMM d, yyyy')}
            </span>
          )}
          
          {onConversationClick && (
            <button
              onClick={() => onConversationClick(conversation)}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <EyeIcon className="h-3 w-3 mr-1" />
              View
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-900 text-sm leading-relaxed">
          {conversation.content}
        </p>
      </div>

      {/* Keywords */}
      {conversation.keywords && conversation.keywords.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {conversation.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {conversation.tags && conversation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {conversation.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {onAddTag && (
            <div className="relative">
              {showAddTag ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag()
                      if (e.key === 'Escape') setShowAddTag(false)
                    }}
                    placeholder="Add tag..."
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTag}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddTag(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTag(true)}
                  className="inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
                >
                  <TagIcon className="h-3 w-3 mr-1" />
                  Add tag
                </button>
              )}
            </div>
          )}
        </div>

        {conversation.url && (
          <a
            href={conversation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <LinkIcon className="h-3 w-3 mr-1" />
            Original
          </a>
        )}
      </div>
    </div>
  )
}

export function SearchResults({
  conversations,
  totalCount,
  loading,
  error,
  currentPage,
  pageSize,
  onPageChange,
  onConversationClick,
  onAddTag,
  showPagination = true
}: SearchResultsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Searching conversations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="bg-white rounded-lg shadow-sm border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {totalCount.toLocaleString()} conversations
            </span>
          </div>
          
          {totalCount > 0 && showPagination && (
            <div className="text-sm text-gray-600">
              Showing {startIndex.toLocaleString()} - {endIndex.toLocaleString()} of {totalCount.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or filters to find more results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onConversationClick={onConversationClick}
              onAddTag={onAddTag}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage <= 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-2 text-sm text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => onPageChange(page as number)}
                        className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}