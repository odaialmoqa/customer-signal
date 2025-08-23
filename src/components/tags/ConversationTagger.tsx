'use client'

import React, { useState } from 'react'
import { useConversationTags } from '@/lib/hooks/useTags'
import { TagInput } from './TagInput'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']

interface ConversationTaggerProps {
  conversationId: string
  className?: string
}

export function ConversationTagger({ conversationId, className = '' }: ConversationTaggerProps) {
  const {
    tags,
    suggestions,
    loading,
    error,
    addTags,
    removeTags,
    acceptSuggestion,
    rejectSuggestion
  } = useConversationTags(conversationId)
  
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])

  // Convert conversation tags to Tag format for TagInput
  const currentTags: Tag[] = tags.map(tag => ({
    id: tag.id,
    tenant_id: tag.tenant_id,
    name: tag.name,
    description: tag.description,
    color: tag.color,
    parent_tag_id: tag.parent_tag_id,
    usage_count: tag.usage_count,
    is_system_tag: tag.is_system_tag,
    created_by: tag.created_by,
    created_at: tag.created_at,
    updated_at: tag.updated_at
  }))

  const handleStartEditing = () => {
    setSelectedTags(currentTags)
    setIsEditing(true)
  }

  const handleSaveTags = async () => {
    try {
      // Find tags to add and remove
      const currentTagIds = currentTags.map(tag => tag.id)
      const selectedTagIds = selectedTags.map(tag => tag.id)
      
      const tagsToAdd = selectedTagIds.filter(id => !currentTagIds.includes(id))
      const tagsToRemove = currentTagIds.filter(id => !selectedTagIds.includes(id))

      // Add new tags
      if (tagsToAdd.length > 0) {
        await addTags(tagsToAdd)
      }

      // Remove tags
      if (tagsToRemove.length > 0) {
        await removeTags(tagsToRemove)
      }

      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save tags:', error)
    }
  }

  const handleCancelEditing = () => {
    setSelectedTags([])
    setIsEditing(false)
  }

  const handleAcceptSuggestion = async (tagId: string) => {
    try {
      await acceptSuggestion(tagId)
    } catch (error) {
      console.error('Failed to accept suggestion:', error)
    }
  }

  const handleRejectSuggestion = async (tagId: string) => {
    try {
      await rejectSuggestion(tagId)
    } catch (error) {
      console.error('Failed to reject suggestion:', error)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500">Loading tags...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Current Tags Display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Tags</h4>
          {!isEditing && (
            <button
              onClick={handleStartEditing}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              placeholder="Add or remove tags..."
              allowCreate={true}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEditing}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentTags.length === 0 ? (
              <span className="text-sm text-gray-500 italic">No tags</span>
            ) : (
              currentTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border"
                  style={{
                    backgroundColor: tag.color + '20',
                    borderColor: tag.color,
                    color: tag.color
                  }}
                >
                  {tag.name}
                  {tag.is_auto_tagged && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" title="Auto-tagged">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tag Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Tags</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.tag_id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{suggestion.tag_name}</span>
                  <span className="text-xs text-gray-500">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                  {suggestion.reason && (
                    <span className="text-xs text-gray-400" title={suggestion.reason}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion.tag_id)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Accept suggestion"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRejectSuggestion(suggestion.tag_id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Reject suggestion"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}