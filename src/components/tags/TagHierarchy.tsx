'use client'

import React, { useState } from 'react'
import { useTags } from '@/lib/hooks/useTags'
import { TagWithHierarchy } from '@/lib/services/tag'

interface TagHierarchyProps {
  onTagSelect?: (tag: TagWithHierarchy) => void
  selectedTagIds?: string[]
  showUsageCount?: boolean
  className?: string
}

export function TagHierarchy({
  onTagSelect,
  selectedTagIds = [],
  showUsageCount = true,
  className = ''
}: TagHierarchyProps) {
  const { tags, loading, error } = useTags({ includeHierarchy: true })
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const hierarchicalTags = tags as TagWithHierarchy[]

  const toggleExpanded = (tagId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId)
    } else {
      newExpanded.add(tagId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderTag = (tag: TagWithHierarchy, level = 0) => {
    const hasChildren = tag.children && tag.children.length > 0
    const isExpanded = expandedNodes.has(tag.id)
    const isSelected = selectedTagIds.includes(tag.id)

    return (
      <div key={tag.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => onTagSelect?.(tag)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(tag.id)
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}

          <span
            className="w-3 h-3 rounded-full border flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />

          <span className="flex-1 text-sm font-medium">{tag.name}</span>

          {tag.is_system_tag && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              System
            </span>
          )}

          {showUsageCount && (
            <span className="text-xs text-gray-500">
              {tag.usage_count}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {tag.children!.map(child => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-red-600 ${className}`}>
        <p className="text-sm">Failed to load tag hierarchy: {error}</p>
      </div>
    )
  }

  if (hierarchicalTags.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <p className="text-sm">No tags available</p>
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Tag Hierarchy</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedNodes(new Set(hierarchicalTags.map(tag => tag.id)))}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedNodes(new Set())}
            className="text-xs text-gray-600 hover:text-gray-700"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
        {hierarchicalTags.map(tag => renderTag(tag))}
      </div>
    </div>
  )
}