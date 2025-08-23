'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTags } from '@/lib/hooks/useTags'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']

interface TagInputProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  placeholder?: string
  maxTags?: number
  allowCreate?: boolean
  className?: string
}

export function TagInput({
  selectedTags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags,
  allowCreate = true,
  className = ''
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isCreating, setIsCreating] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const { searchTags, createTag, getPopularTags } = useTags()

  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.trim().length > 0) {
        const results = await searchTags(inputValue.trim(), 10)
        // Filter out already selected tags
        const filtered = results.filter(
          tag => !selectedTags.some(selected => selected.id === tag.id)
        )
        setSuggestions(filtered)
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } else {
        // Show popular tags when input is empty
        const popular = await getPopularTags(10)
        const filtered = popular.filter(
          tag => !selectedTags.some(selected => selected.id === tag.id)
        )
        setSuggestions(filtered)
        setShowSuggestions(false)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 200)
    return () => clearTimeout(debounceTimer)
  }, [inputValue, selectedTags, searchTags, getPopularTags])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setShowSuggestions(false)
      }
    }, 150)
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        await selectTag(suggestions[selectedIndex])
      } else if (inputValue.trim() && allowCreate) {
        await createNewTag(inputValue.trim())
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag when backspacing on empty input
      const newTags = selectedTags.slice(0, -1)
      onTagsChange(newTags)
    }
  }

  const selectTag = async (tag: Tag) => {
    if (maxTags && selectedTags.length >= maxTags) {
      return
    }

    const newTags = [...selectedTags, tag]
    onTagsChange(newTags)
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const createNewTag = async (name: string) => {
    if (maxTags && selectedTags.length >= maxTags) {
      return
    }

    try {
      setIsCreating(true)
      const newTag = await createTag({ name })
      const newTags = [...selectedTags, newTag]
      onTagsChange(newTags)
      setInputValue('')
      setShowSuggestions(false)
      setSelectedIndex(-1)
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to create tag:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const removeTag = (tagToRemove: Tag) => {
    const newTags = selectedTags.filter(tag => tag.id !== tagToRemove.id)
    onTagsChange(newTags)
    inputRef.current?.focus()
  }

  const getTagColor = (color: string) => {
    return {
      backgroundColor: color + '20',
      borderColor: color,
      color: color
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[42px]">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border"
            style={getTagColor(tag.color)}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          disabled={isCreating || (maxTags ? selectedTags.length >= maxTags : false)}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
        />
        
        {isCreating && (
          <div className="flex items-center">
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectTag(tag)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1">{tag.name}</span>
              {tag.usage_count > 0 && (
                <span className="text-xs text-gray-500">
                  {tag.usage_count} uses
                </span>
              )}
            </button>
          ))}
          
          {allowCreate && inputValue.trim() && !suggestions.some(tag => 
            tag.name.toLowerCase() === inputValue.trim().toLowerCase()
          ) && (
            <button
              type="button"
              onClick={() => createNewTag(inputValue.trim())}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-t ${
                selectedIndex === suggestions.length ? 'bg-blue-50' : ''
              }`}
            >
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create "{inputValue.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}