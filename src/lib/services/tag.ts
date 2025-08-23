import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']
type TagInsert = Database['public']['Tables']['tags']['Insert']
type TagUpdate = Database['public']['Tables']['tags']['Update']
type ConversationTag = Database['public']['Tables']['conversation_tags']['Row']
type TagSuggestion = Database['public']['Tables']['tag_suggestions']['Row']

export interface TagWithHierarchy extends Tag {
  level: number
  path: string[]
  root_name: string
  children?: TagWithHierarchy[]
}

export interface TagStats {
  totalTags: number
  systemTags: number
  userTags: number
  mostUsedTags: Array<{
    id: string
    name: string
    usage_count: number
    color: string
  }>
}

export interface BulkTagRequest {
  conversationIds: string[]
  tagIds: string[]
}

export interface TagSuggestionResponse {
  tag_id: string
  tag_name: string
  confidence: number
  reason: string | null
}

export class TagService {
  private supabase = createClient()

  /**
   * Get all tags for the current tenant
   */
  async getTags(includeHierarchy = false): Promise<Tag[] | TagWithHierarchy[]> {
    if (includeHierarchy) {
      const { data, error } = await this.supabase
        .from('tag_hierarchy')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return this.buildTagHierarchy(data || [])
    }

    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get a specific tag by ID
   */
  async getTag(id: string): Promise<Tag | null> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Create a new tag
   */
  async createTag(tag: TagInsert): Promise<Tag> {
    const { data, error } = await this.supabase
      .from('tags')
      .insert(tag)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, updates: TagUpdate): Promise<Tag> {
    const { data, error } = await this.supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string, limit = 10): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get popular tags for autocomplete
   */
  async getPopularTags(limit = 20): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get tags for a specific conversation
   */
  async getConversationTags(conversationId: string): Promise<Array<Tag & { tagged_at: string; tagged_by: string | null; is_auto_tagged: boolean }>> {
    const { data, error } = await this.supabase
      .from('conversation_tags')
      .select(`
        tagged_at,
        tagged_by,
        is_auto_tagged,
        tags (*)
      `)
      .eq('conversation_id', conversationId)
      .order('tagged_at', { ascending: false })

    if (error) throw error
    
    return (data || []).map(item => ({
      ...item.tags,
      tagged_at: item.tagged_at,
      tagged_by: item.tagged_by,
      is_auto_tagged: item.is_auto_tagged
    })) as Array<Tag & { tagged_at: string; tagged_by: string | null; is_auto_tagged: boolean }>
  }

  /**
   * Add tags to a conversation
   */
  async tagConversation(conversationId: string, tagIds: string[], taggedBy?: string): Promise<ConversationTag[]> {
    const inserts = tagIds.map(tagId => ({
      conversation_id: conversationId,
      tag_id: tagId,
      tagged_by: taggedBy || null,
      is_auto_tagged: false
    }))

    const { data, error } = await this.supabase
      .from('conversation_tags')
      .insert(inserts)
      .select()

    if (error) throw error
    return data || []
  }

  /**
   * Remove tags from a conversation
   */
  async untagConversation(conversationId: string, tagIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_tags')
      .delete()
      .eq('conversation_id', conversationId)
      .in('tag_id', tagIds)

    if (error) throw error
  }

  /**
   * Bulk tag multiple conversations
   */
  async bulkTagConversations(request: BulkTagRequest, taggedBy?: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('bulk_tag_conversations', {
        conversation_ids: request.conversationIds,
        tag_ids: request.tagIds,
        tagged_by_param: taggedBy || null
      })

    if (error) throw error
    return data || 0
  }

  /**
   * Get tag suggestions for a conversation
   */
  async getTagSuggestions(conversationId: string): Promise<TagSuggestionResponse[]> {
    const { data, error } = await this.supabase
      .rpc('get_tag_suggestions', {
        conversation_id_param: conversationId
      })

    if (error) throw error
    return data || []
  }

  /**
   * Accept a tag suggestion
   */
  async acceptTagSuggestion(conversationId: string, tagId: string, taggedBy?: string): Promise<void> {
    // Update suggestion status
    await this.supabase
      .from('tag_suggestions')
      .update({ status: 'accepted' })
      .eq('conversation_id', conversationId)
      .eq('tag_id', tagId)

    // Add the tag to the conversation
    await this.tagConversation(conversationId, [tagId], taggedBy)
  }

  /**
   * Reject a tag suggestion
   */
  async rejectTagSuggestion(conversationId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tag_suggestions')
      .update({ status: 'rejected' })
      .eq('conversation_id', conversationId)
      .eq('tag_id', tagId)

    if (error) throw error
  }

  /**
   * Get tag statistics
   */
  async getTagStats(): Promise<TagStats> {
    const { data: allTags, error: tagsError } = await this.supabase
      .from('tags')
      .select('id, name, usage_count, color, is_system_tag')

    if (tagsError) throw tagsError

    const tags = allTags || []
    const systemTags = tags.filter(tag => tag.is_system_tag).length
    const userTags = tags.filter(tag => !tag.is_system_tag).length
    const mostUsedTags = tags
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)
      .map(tag => ({
        id: tag.id,
        name: tag.name,
        usage_count: tag.usage_count,
        color: tag.color
      }))

    return {
      totalTags: tags.length,
      systemTags,
      userTags,
      mostUsedTags
    }
  }

  /**
   * Get conversations by tag
   */
  async getConversationsByTag(tagId: string, limit = 50, offset = 0): Promise<Array<any>> {
    const { data, error } = await this.supabase
      .from('conversation_tags')
      .select(`
        tagged_at,
        conversations (*)
      `)
      .eq('tag_id', tagId)
      .order('tagged_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return (data || []).map(item => ({
      ...item.conversations,
      tagged_at: item.tagged_at
    }))
  }

  /**
   * Build hierarchical tag structure
   */
  private buildTagHierarchy(flatTags: any[]): TagWithHierarchy[] {
    const tagMap = new Map<string, TagWithHierarchy>()
    const rootTags: TagWithHierarchy[] = []

    // First pass: create all tag objects
    flatTags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [] })
    })

    // Second pass: build hierarchy
    flatTags.forEach(tag => {
      const tagObj = tagMap.get(tag.id)!
      if (tag.parent_tag_id) {
        const parent = tagMap.get(tag.parent_tag_id)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(tagObj)
        }
      } else {
        rootTags.push(tagObj)
      }
    })

    return rootTags
  }
}

export const tagService = new TagService()