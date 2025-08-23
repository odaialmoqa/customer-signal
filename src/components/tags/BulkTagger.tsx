'use client'

import React, { useState } from 'react'
import { useBulkTagging, useTags } from '@/lib/hooks/useTags'
import { TagInput } from './TagInput'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']

interface BulkTaggerProps {
  selectedConversationIds: string[]
  onComplete?: () => void
  onCancel?: () => void
  className?: string
}

export function BulkTagger({
  selectedConversationIds,
  onComplete,
  onCancel,
  className = ''
}: BulkTaggerProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  
  const { bulkTag, loading, error } = useBulkTagging()

  const handleBulkTag = async () => {
    if (selectedTags.length === 0) {
      setResult({ success: false, message: 'Please select at least one tag.' })
      return
    }

    if (selectedConversationIds.length === 0) {
      setResult({ success: false, message: 'No conversations selected.' })
      return
    }

    try {
      setIsProcessing(true)
      setResult(null)
      
      const taggedCount = await bulkTag({
        conversationIds: selectedConversationIds,
        tagIds: selectedTags.map(tag => tag.id)
      })

      setResult({
        success: true,
        message: `Successfully applied ${selectedTags.length} tag(s) to ${selectedConversationIds.length} conversation(s). ${taggedCount} new tag associations created.`
      })

      // Auto-close after success
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to apply tags'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setSelectedTags([])
    setResult(null)
    onCancel?.()
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Bulk Tag Conversations</h3>
        <p className="text-sm text-gray-600 mt-1">
          Apply tags to {selectedConversationIds.length} selected conversation{selectedConversationIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tags to Apply
          </label>
          <TagInput
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            placeholder="Choose tags to apply..."
            allowCreate={true}
          />
          <p className="text-xs text-gray-500 mt-1">
            You can select existing tags or create new ones. Tags will be added to all selected conversations.
          </p>
        </div>

        {result && (
          <div className={`p-3 rounded-lg ${
            result.success 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className="text-sm">{result.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
        <button
          onClick={handleCancel}
          disabled={isProcessing}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleBulkTag}
          disabled={isProcessing || loading || selectedTags.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isProcessing && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Apply Tags
        </button>
      </div>
    </div>
  )
}