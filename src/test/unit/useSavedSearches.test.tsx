import { renderHook, act } from '@testing-library/react'
import { useSavedSearches } from '@/lib/hooks/useSavedSearches'
import { SearchFilters } from '@/lib/services/conversation'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useSavedSearches', () => {
  const tenantId = 'test-tenant'
  const storageKey = `customer-signal-saved-searches-${tenantId}`

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('initializes with empty saved searches', () => {
    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    expect(result.current.savedSearches).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(localStorageMock.getItem).toHaveBeenCalledWith(storageKey)
  })

  it('loads saved searches from localStorage', () => {
    const mockSavedSearches = [
      {
        id: 'search-1',
        name: 'Test Search',
        filters: { query: 'test' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ]

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedSearches))

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    expect(result.current.savedSearches).toEqual(mockSavedSearches)
    expect(localStorageMock.getItem).toHaveBeenCalledWith(storageKey)
  })

  it('handles localStorage parsing errors', () => {
    localStorageMock.getItem.mockReturnValue('invalid json')

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    expect(result.current.savedSearches).toEqual([])
    expect(result.current.error).toBe('Failed to load saved searches')
  })

  it('saves a new search', async () => {
    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    const filters: SearchFilters = { query: 'new search', platforms: ['reddit'] }
    let savedSearch: any

    await act(async () => {
      savedSearch = await result.current.saveSearch('New Search', filters)
    })

    expect(savedSearch).toMatchObject({
      name: 'New Search',
      filters,
      id: expect.stringMatching(/^search-\d+-[a-z0-9]+$/),
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    })

    expect(result.current.savedSearches).toHaveLength(1)
    expect(result.current.savedSearches[0]).toEqual(savedSearch)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify([savedSearch])
    )
  })

  it('updates an existing search', async () => {
    const existingSearch = {
      id: 'search-1',
      name: 'Original Search',
      filters: { query: 'original' },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify([existingSearch]))

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    const newFilters: SearchFilters = { query: 'updated', platforms: ['twitter'] }
    let updatedSearch: any

    await act(async () => {
      updatedSearch = await result.current.updateSearch('search-1', 'Updated Search', newFilters)
    })

    expect(updatedSearch).toMatchObject({
      id: 'search-1',
      name: 'Updated Search',
      filters: newFilters,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: expect.any(String)
    })

    expect(result.current.savedSearches).toHaveLength(1)
    expect(result.current.savedSearches[0]).toEqual(updatedSearch)
  })

  it('handles updating non-existent search', async () => {
    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    let updatedSearch: any

    await act(async () => {
      updatedSearch = await result.current.updateSearch('non-existent', 'Test', {})
    })

    expect(updatedSearch).toBe(null)
    expect(result.current.error).toBe('Search not found')
  })

  it('deletes a search', async () => {
    const existingSearches = [
      {
        id: 'search-1',
        name: 'Search 1',
        filters: { query: 'test1' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'search-2',
        name: 'Search 2',
        filters: { query: 'test2' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ]

    localStorageMock.getItem.mockReturnValue(JSON.stringify(existingSearches))

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    let deleteResult: boolean

    await act(async () => {
      deleteResult = await result.current.deleteSearch('search-1')
    })

    expect(deleteResult).toBe(true)
    expect(result.current.savedSearches).toHaveLength(1)
    expect(result.current.savedSearches[0].id).toBe('search-2')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify([existingSearches[1]])
    )
  })

  it('loads a specific search by id', () => {
    const existingSearches = [
      {
        id: 'search-1',
        name: 'Search 1',
        filters: { query: 'test1' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'search-2',
        name: 'Search 2',
        filters: { query: 'test2' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ]

    localStorageMock.getItem.mockReturnValue(JSON.stringify(existingSearches))

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    const loadedSearch = result.current.loadSearch('search-2')
    expect(loadedSearch).toEqual(existingSearches[1])

    const nonExistentSearch = result.current.loadSearch('non-existent')
    expect(nonExistentSearch).toBe(null)
  })

  it('refreshes saved searches', () => {
    const initialSearches = [
      {
        id: 'search-1',
        name: 'Search 1',
        filters: { query: 'test1' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ]

    const updatedSearches = [
      ...initialSearches,
      {
        id: 'search-2',
        name: 'Search 2',
        filters: { query: 'test2' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ]

    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(initialSearches))
      .mockReturnValueOnce(JSON.stringify(updatedSearches))

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    expect(result.current.savedSearches).toHaveLength(1)

    act(() => {
      result.current.refresh()
    })

    expect(result.current.savedSearches).toHaveLength(2)
    expect(localStorageMock.getItem).toHaveBeenCalledTimes(2)
  })

  it('handles localStorage setItem errors', async () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    let savedSearch: any

    await act(async () => {
      savedSearch = await result.current.saveSearch('Test Search', { query: 'test' })
    })

    expect(savedSearch).toBe(null)
    expect(result.current.error).toBe('Storage quota exceeded')
  })

  it('trims search names when saving', async () => {
    // Reset localStorage mock to not throw errors
    localStorageMock.setItem.mockImplementation(() => {})
    
    const { result } = renderHook(() => useSavedSearches({ tenantId }))

    let savedSearch: any

    await act(async () => {
      savedSearch = await result.current.saveSearch('  Trimmed Search  ', { query: 'test' })
    })

    expect(savedSearch).toBeTruthy()
    expect(savedSearch.name).toBe('Trimmed Search')
  })

  it('uses different storage keys for different tenants', () => {
    const tenant1 = 'tenant-1'
    const tenant2 = 'tenant-2'

    renderHook(() => useSavedSearches({ tenantId: tenant1 }))
    expect(localStorageMock.getItem).toHaveBeenCalledWith(`customer-signal-saved-searches-${tenant1}`)

    renderHook(() => useSavedSearches({ tenantId: tenant2 }))
    expect(localStorageMock.getItem).toHaveBeenCalledWith(`customer-signal-saved-searches-${tenant2}`)
  })
})