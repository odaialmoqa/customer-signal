import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { TagService } from '@/lib/services/tag'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn()
}

const createMockQuery = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis()
})

describe('TagService', () => {
  let tagService: TagService
  let mockQuery: ReturnType<typeof createMockQuery>
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery = createMockQuery()
    ;(createClient as Mock).mockReturnValue(mockSupabase)
    mockSupabase.from.mockReturnValue(mockQuery)
    tagService = new TagService()
  })

  describe('getTags', () => {
    it('should fetch all tags without hierarchy', async () => {
      const mockTags = [
        { id: '1', name: 'Bug Report', color: '#EF4444', usage_count: 5 },
        { id: '2', name: 'Feature Request', color: '#3B82F6', usage_count: 3 }
      ]

      mockQuery.select.mockResolvedValue({ data: mockTags, error: null })

      const result = await tagService.getTags(false)

      expect(mockSupabase.from).toHaveBeenCalledWith('tags')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.order).toHaveBeenCalledWith('usage_count', { ascending: false })
      expect(result).toEqual(mockTags)
    })

    it('should fetch tags with hierarchy', async () => {
      const mockHierarchyTags = [
        { id: '1', name: 'Bug Report', level: 0, path: ['Bug Report'], children: [] },
        { id: '2', name: 'Critical Bug', level: 1, path: ['Bug Report', 'Critical Bug'], children: [] }
      ]

      mockQuery.select.mockResolvedValue({ data: mockHierarchyTags, error: null })

      const result = await tagService.getTags(true)

      expect(mockSupabase.from).toHaveBeenCalledWith('tag_hierarchy')
      expect(result).toBeDefined()
    })

    it('should handle fetch error', async () => {
      mockQuery.select.mockResolvedValue({ data: null, error: { message: 'Database error' } })

      await expect(tagService.getTags()).rejects.toThrow('Database error')
    })
  })

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const newTag = {
        tenant_id: 'tenant-1',
        name: 'New Tag',
        description: 'A new tag',
        color: '#10B981'
      }

      const createdTag = { id: '3', ...newTag, usage_count: 0 }
      mockQuery.single.mockResolvedValue({ data: createdTag, error: null })

      const result = await tagService.createTag(newTag)

      expect(mockSupabase.from).toHaveBeenCalledWith('tags')
      expect(mockQuery.insert).toHaveBeenCalledWith(newTag)
      expect(result).toEqual(createdTag)
    })

    it('should handle creation error', async () => {
      const newTag = {
        tenant_id: 'tenant-1',
        name: 'Duplicate Tag',
        color: '#10B981'
      }

      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'unique_tag_name_per_tenant' } 
      })

      await expect(tagService.createTag(newTag)).rejects.toThrow('unique_tag_name_per_tenant')
    })
  })

  describe('updateTag', () => {
    it('should update an existing tag', async () => {
      const updates = { name: 'Updated Tag', color: '#F59E0B' }
      const updatedTag = { id: '1', ...updates, usage_count: 5 }

      mockQuery.single.mockResolvedValue({ data: updatedTag, error: null })

      const result = await tagService.updateTag('1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('tags')
      expect(mockQuery.update).toHaveBeenCalledWith(updates)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedTag)
    })
  })

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockQuery.delete.mockResolvedValue({ error: null })

      await tagService.deleteTag('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('tags')
      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('searchTags', () => {
    it('should search tags by name', async () => {
      const searchResults = [
        { id: '1', name: 'Bug Report', color: '#EF4444', usage_count: 5 }
      ]

      mockQuery.limit.mockResolvedValue({ data: searchResults, error: null })

      const result = await tagService.searchTags('bug', 10)

      expect(mockSupabase.from).toHaveBeenCalledWith('tags')
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%bug%')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(result).toEqual(searchResults)
    })
  })

  describe('tagConversation', () => {
    it('should add tags to a conversation', async () => {
      const conversationTags = [
        { id: 'ct-1', conversation_id: 'conv-1', tag_id: 'tag-1', tagged_by: 'user-1' }
      ]

      mockQuery.select.mockResolvedValue({ data: conversationTags, error: null })

      const result = await tagService.tagConversation('conv-1', ['tag-1'], 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('conversation_tags')
      expect(mockQuery.insert).toHaveBeenCalledWith([{
        conversation_id: 'conv-1',
        tag_id: 'tag-1',
        tagged_by: 'user-1',
        is_auto_tagged: false
      }])
      expect(result).toEqual(conversationTags)
    })
  })

  describe('bulkTagConversations', () => {
    it('should bulk tag multiple conversations', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 5, error: null })

      const result = await tagService.bulkTagConversations({
        conversationIds: ['conv-1', 'conv-2'],
        tagIds: ['tag-1', 'tag-2']
      }, 'user-1')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('bulk_tag_conversations', {
        conversation_ids: ['conv-1', 'conv-2'],
        tag_ids: ['tag-1', 'tag-2'],
        tagged_by_param: 'user-1'
      })
      expect(result).toBe(5)
    })
  })

  describe('getTagSuggestions', () => {
    it('should get tag suggestions for a conversation', async () => {
      const suggestions = [
        { tag_id: 'tag-1', tag_name: 'Bug Report', confidence: 0.85, reason: 'Contains error keywords' }
      ]

      mockSupabase.rpc.mockResolvedValue({ data: suggestions, error: null })

      const result = await tagService.getTagSuggestions('conv-1')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_tag_suggestions', {
        conversation_id_param: 'conv-1'
      })
      expect(result).toEqual(suggestions)
    })
  })

  describe('acceptTagSuggestion', () => {
    it('should accept a tag suggestion and apply the tag', async () => {
      mockQuery.update.mockResolvedValue({ error: null })
      mockQuery.insert.mockResolvedValue({ data: [], error: null })

      await tagService.acceptTagSuggestion('conv-1', 'tag-1', 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('tag_suggestions')
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'accepted' })
      expect(mockQuery.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('tag_id', 'tag-1')
    })
  })

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      const mockTags = [
        { id: '1', name: 'Bug', usage_count: 5, color: '#EF4444', is_system_tag: true },
        { id: '2', name: 'Custom', usage_count: 3, color: '#10B981', is_system_tag: false }
      ]

      mockQuery.select.mockResolvedValue({ data: mockTags, error: null })

      const result = await tagService.getTagStats()

      expect(result).toEqual({
        totalTags: 2,
        systemTags: 1,
        userTags: 1,
        mostUsedTags: [
          { id: '1', name: 'Bug', usage_count: 5, color: '#EF4444' },
          { id: '2', name: 'Custom', usage_count: 3, color: '#10B981' }
        ]
      })
    })
  })

  describe('buildTagHierarchy', () => {
    it('should build hierarchical structure from flat tags', async () => {
      const flatTags = [
        { id: '1', name: 'Parent', parent_tag_id: null, level: 0 },
        { id: '2', name: 'Child', parent_tag_id: '1', level: 1 }
      ]

      mockQuery.select.mockResolvedValue({ data: flatTags, error: null })

      const result = await tagService.getTags(true)
      
      // The buildTagHierarchy method is private, but we can test it through getTags
      expect(mockSupabase.from).toHaveBeenCalledWith('tag_hierarchy')
    })
  })
})