'use client'

import React, { useState, useEffect } from 'react'
import { AdvancedSearchFilters } from './AdvancedSearchFilters'
import { SearchResults } from './SearchResults'
import { useConversations } from '@/lib/hooks/useConversations'
import { useSavedSearches } from '@/lib/hooks/useSavedSearches'
import { SearchFilters } from '@/lib/services/conversation'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

interface SearchPageProps {
  tenantId: string
  initialFilters?: SearchFilters
  onConversationClick?: (conversation: ConversationRow) => void
}

export function SearchPage({
  tenantId,
  initialFilters = {},
  onConversationClick
}: SearchPageProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  const {
    conversations,
    loading,
    error,
    totalCount,
    searchConversations,
    addTags
  } = useConversations({
    tenantId,
    autoFetch: false
  })

  const {
    savedSearches,
    loading: savedSearchesLoading,
    error: savedSearchesError,
    saveSearch,
    deleteSearch
  } = useSavedSearches({ tenantId })

  // Perform search when filters change
  const handleSearch = async (searchFilters: SearchFilters) => {
    setCurrentPage(1) // Reset to first page
    const paginatedFilters = {
      ...searchFilters,
      limit: pageSize,
      offset: 0
    }
    await searchConversations(paginatedFilters)
  }

  // Handle pagination
  const handlePageChange = async (page: number) => {
    setCurrentPage(page)
    const paginatedFilters = {
      ...filters,
      limit: pageSize,
      offset: (page - 1) * pageSize
    }
    await searchConversations(paginatedFilters)
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters)
  }

  // Handle saving searches
  const handleSaveSearch = async (name: string, searchFilters: SearchFilters) => {
    try {
      await saveSearch(name, searchFilters)
    } catch (err) {
      console.error('Failed to save search:', err)
    }
  }

  // Handle loading saved searches
  const handleLoadSavedSearch = (savedSearch: any) => {
    setFilters(savedSearch.filters)
    handleSearch(savedSearch.filters)
  }

  // Handle adding tags to conversations
  const handleAddTag = async (conversationId: string, tag: string) => {
    try {
      await addTags(conversationId, [tag])
    } catch (err) {
      console.error('Failed to add tag:', err)
    }
  }

  // Initial search on mount if there are initial filters
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      handleSearch(initialFilters)
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Conversations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Search and filter through all captured conversations and mentions
          </p>
        </div>

        {/* Search Filters */}
        <AdvancedSearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          loading={loading}
          tenantId={tenantId}
          savedSearches={savedSearches}
          onSaveSearch={handleSaveSearch}
          onDeleteSavedSearch={deleteSearch}
          onLoadSavedSearch={handleLoadSavedSearch}
        />

        {/* Search Results */}
        <SearchResults
          conversations={conversations}
          totalCount={totalCount}
          loading={loading}
          error={error}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onConversationClick={onConversationClick}
          onAddTag={handleAddTag}
          showPagination={true}
        />
      </div>
    </div>
  )
}