import { useState, useEffect } from 'react'
import { SearchFilters } from '@/lib/services/conversation'

export interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
  updatedAt: string
}

interface UseSavedSearchesOptions {
  tenantId: string
}

export interface UseSavedSearchesReturn {
  savedSearches: SavedSearch[]
  loading: boolean
  error: string | null
  saveSearch: (name: string, filters: SearchFilters) => Promise<SavedSearch | null>
  updateSearch: (id: string, name: string, filters: SearchFilters) => Promise<SavedSearch | null>
  deleteSearch: (id: string) => Promise<boolean>
  loadSearch: (id: string) => SavedSearch | null
  refresh: () => void
}

const STORAGE_KEY = 'customer-signal-saved-searches'

export function useSavedSearches({
  tenantId
}: UseSavedSearchesOptions): UseSavedSearchesReturn {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved searches from localStorage on mount
  useEffect(() => {
    loadSavedSearches()
  }, [tenantId])

  const loadSavedSearches = () => {
    try {
      setLoading(true)
      const stored = localStorage.getItem(`${STORAGE_KEY}-${tenantId}`)
      if (stored) {
        const searches = JSON.parse(stored) as SavedSearch[]
        setSavedSearches(searches)
      } else {
        setSavedSearches([])
      }
      setError(null)
    } catch (err) {
      setError('Failed to load saved searches')
      setSavedSearches([])
    } finally {
      setLoading(false)
    }
  }

  const saveSavedSearches = (searches: SavedSearch[]) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${tenantId}`, JSON.stringify(searches))
      setSavedSearches(searches)
      setError(null)
    } catch (err) {
      setError('Failed to save searches')
      throw err
    }
  }

  const saveSearch = async (name: string, filters: SearchFilters): Promise<SavedSearch | null> => {
    try {
      setLoading(true)
      setError(null)

      const newSearch: SavedSearch = {
        id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        filters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const updatedSearches = [...savedSearches, newSearch]
      saveSavedSearches(updatedSearches)
      
      return newSearch
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save search')
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateSearch = async (
    id: string, 
    name: string, 
    filters: SearchFilters
  ): Promise<SavedSearch | null> => {
    try {
      setLoading(true)
      setError(null)

      const searchIndex = savedSearches.findIndex(s => s.id === id)
      if (searchIndex === -1) {
        throw new Error('Search not found')
      }

      const updatedSearch: SavedSearch = {
        ...savedSearches[searchIndex],
        name: name.trim(),
        filters,
        updatedAt: new Date().toISOString()
      }

      const updatedSearches = [...savedSearches]
      updatedSearches[searchIndex] = updatedSearch
      saveSavedSearches(updatedSearches)

      return updatedSearch
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update search')
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteSearch = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const updatedSearches = savedSearches.filter(s => s.id !== id)
      saveSavedSearches(updatedSearches)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete search')
      return false
    } finally {
      setLoading(false)
    }
  }

  const loadSearch = (id: string): SavedSearch | null => {
    return savedSearches.find(s => s.id === id) || null
  }

  const refresh = () => {
    loadSavedSearches()
  }

  return {
    savedSearches,
    loading,
    error,
    saveSearch,
    updateSearch,
    deleteSearch,
    loadSearch,
    refresh
  }
}