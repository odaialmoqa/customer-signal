'use client'

import React, { useState, useEffect } from 'react'
import { useTags } from '@/lib/hooks/useTags'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']

export interface TagFilterValue {
  includeTags: string[]
  excludeTags: string[]
  tagOperator: 'AND' | 'OR'
}

interface TagFilterProps {
  value: TagFilterValue
  onChange: (value: TagFilterValue) => void
  className?: string
}

export function TagFilter({ value, onChange, className = '' }: TagFilterProps) {
  const { tags, loading, getPopularTags } = useTags()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [popularTags, setPopularTags] = useState<Tag[]>([])

  useEffect(() => {
    const fetchPopularTags = async () => {
      const popular = await getPopularTags(20)
      setPopularTags(popular)
    }
    fetchPopularTags()
  }, [getPopularTags])

  const allTags = Array.isArray(tags) ? tags : []
  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const displayTags = searchQuery ? filteredTags : popularTags

  const handleTagToggle = (tagId: string, type: 'include' | 'exclude') => {
    const currentList = type === 'include' ? value.includeTags : value.excludeTags
    const otherList = type === 'include' ? value.excludeTags : value.includeTags
    const otherKey = type === 'include' ? 'excludeTags' : 'includeTags'
    
    let newList: string[]
    let newOtherList = otherList

    if (currentList.includes(tagId)) {
      // Remove from current list
      newList = currentList.filter(id => id !== tagId)
    } else {
      // Add to current list and remove from other list if present
      newList = [...currentList, tagId]
      newOtherList = otherList.filter(id => id !== tagId)
    }

    onChange({
      ...value,
      [type === 'include' ? 'includeTags' : 'excludeTags']: newList,
      [otherKey]: newOtherList
    })
  }

  const handleOperatorChange = (operator: 'AND' | 'OR') => {
    onChange({ ...value, tagOperator: operator })
  }

  const clearAllFilters = () => {
    onChange({
      includeTags: [],
      excludeTags: [],
      tagOperator: 'AND'
    })
  }

  const getTagById = (tagId: string) => {
    return allTags.find(tag => tag.id === tagId)
  }

  const hasActiveFilters = value.includeTags.length > 0 || value.excludeTags.length > 0

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="font-medium">Filter by Tags</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              {value.includeTags.length + value.excludeTags.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active Filters</span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              
              {value.includeTags.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Include:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {value.includeTags.map(tagId => {
                      const tag = getTagById(tagId)
                      return tag ? (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border"
                          style={{
                            backgroundColor: tag.color + '20',
                            borderColor: tag.color,
                            color: tag.color
                          }}
                        >
                          {tag.name}
                          <button
                            onClick={() => handleTagToggle(tagId, 'include')}
                            className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                          >
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {value.excludeTags.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Exclude:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {value.excludeTags.map(tagId => {
                      const tag = getTagById(tagId)
                      return tag ? (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border bg-red-50 border-red-200 text-red-700"
                        >
                          {tag.name}
                          <button
                            onClick={() => handleTagToggle(tagId, 'exclude')}
                            className="hover:bg-red-200 rounded-full p-0.5"
                          >
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {value.includeTags.length > 1 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Match:</span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleOperatorChange('AND')}
                      className={`px-2 py-1 text-xs rounded border ${
                        value.tagOperator === 'AND'
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All tags (AND)
                    </button>
                    <button
                      onClick={() => handleOperatorChange('OR')}
                      className={`px-2 py-1 text-xs rounded border ${
                        value.tagOperator === 'OR'
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Any tag (OR)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Tags */}
          <div>
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tag List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : displayTags.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                {searchQuery ? 'No tags found matching your search.' : 'No tags available.'}
              </div>
            ) : (
              <div className="space-y-1">
                {displayTags.map((tag) => {
                  const isIncluded = value.includeTags.includes(tag.id)
                  const isExcluded = value.excludeTags.includes(tag.id)
                  
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                        <span className="text-xs text-gray-500">({tag.usage_count})</span>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTagToggle(tag.id, 'include')}
                          className={`p-1 rounded text-xs ${
                            isIncluded
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                          }`}
                          title="Include this tag"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleTagToggle(tag.id, 'exclude')}
                          className={`p-1 rounded text-xs ${
                            isExcluded
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                          }`}
                          title="Exclude this tag"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}