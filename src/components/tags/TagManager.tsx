'use client'

import React, { useState } from 'react'
import { useTags, useTagStats } from '@/lib/hooks/useTags'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']

interface TagManagerProps {
  onClose?: () => void
}

export function TagManager({ onClose }: TagManagerProps) {
  const { tags, loading, error, createTag, updateTag, deleteTag, refreshTags } = useTags({ includeHierarchy: true })
  const { stats, refreshStats } = useTagStats()
  
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    parent_tag_id: ''
  })

  const filteredTags = Array.isArray(tags) ? tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : []

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTag({
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        parent_tag_id: formData.parent_tag_id || null
      })
      setIsCreating(false)
      setFormData({ name: '', description: '', color: '#6B7280', parent_tag_id: '' })
      refreshStats()
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTag) return

    try {
      await updateTag(selectedTag.id, {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        parent_tag_id: formData.parent_tag_id || null
      })
      setIsEditing(false)
      setSelectedTag(null)
      refreshStats()
    } catch (error) {
      console.error('Failed to update tag:', error)
    }
  }

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all conversations.`)) {
      return
    }

    try {
      await deleteTag(tag.id)
      if (selectedTag?.id === tag.id) {
        setSelectedTag(null)
      }
      refreshStats()
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const startEditing = (tag: Tag) => {
    setSelectedTag(tag)
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      parent_tag_id: tag.parent_tag_id || ''
    })
    setIsEditing(true)
    setIsCreating(false)
  }

  const startCreating = () => {
    setFormData({ name: '', description: '', color: '#6B7280', parent_tag_id: '' })
    setIsCreating(true)
    setIsEditing(false)
    setSelectedTag(null)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setIsCreating(false)
    setSelectedTag(null)
    setFormData({ name: '', description: '', color: '#6B7280', parent_tag_id: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tag Management</h2>
          {stats && (
            <p className="text-sm text-gray-600 mt-1">
              {stats.totalTags} total tags ({stats.systemTags} system, {stats.userTags} custom)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Tag
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Tag List */}
        <div className="w-1/2 border-r">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'No tags found matching your search.' : 'No tags available.'}
              </div>
            ) : (
              filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                    selectedTag?.id === tag.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedTag(tag)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium">{tag.name}</span>
                      {tag.is_system_tag && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          System
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{tag.usage_count} uses</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditing(tag)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!tag.is_system_tag && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTag(tag)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {tag.description && (
                    <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tag Form */}
        <div className="w-1/2 p-6">
          {isCreating || isEditing ? (
            <form onSubmit={isCreating ? handleCreateTag : handleUpdateTag}>
              <h3 className="text-lg font-medium mb-4">
                {isCreating ? 'Create New Tag' : 'Edit Tag'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Tag (Optional)
                  </label>
                  <select
                    value={formData.parent_tag_id}
                    onChange={(e) => setFormData({ ...formData, parent_tag_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent</option>
                    {filteredTags
                      .filter(tag => tag.id !== selectedTag?.id)
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isCreating ? 'Create Tag' : 'Update Tag'}
                </button>
              </div>
            </form>
          ) : selectedTag ? (
            <div>
              <h3 className="text-lg font-medium mb-4">Tag Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: selectedTag.color }}
                  />
                  <span className="font-medium text-lg">{selectedTag.name}</span>
                  {selectedTag.is_system_tag && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      System Tag
                    </span>
                  )}
                </div>
                
                {selectedTag.description && (
                  <p className="text-gray-600">{selectedTag.description}</p>
                )}
                
                <div className="text-sm text-gray-500">
                  <p>Used in {selectedTag.usage_count} conversations</p>
                  <p>Created {new Date(selectedTag.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => startEditing(selectedTag)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Tag
                </button>
                {!selectedTag.is_system_tag && (
                  <button
                    onClick={() => handleDeleteTag(selectedTag)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Tag
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p>Select a tag to view details or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}