import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']
type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export interface SearchFilters {
  query?: string
  platforms?: string[]
  sentiments?: ('positive' | 'negative' | 'neutral')[]
  keywords?: string[]
  tags?: string[]
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface ConversationStats {
  totalConversations: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  platformDistribution: Record<string, number>
  dailyCounts: Record<string, number>
}

export interface SimilarConversation {
  id: string
  content: string
  author: string | null
  platform: string
  timestamp: string | null
  similarityScore: number
}

export interface BulkInsertResult {
  insertedCount: number
  updatedCount: number
  skippedCount: number
}

export class ConversationService {
  private supabase: any

  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    } else {
      // Use browser client by default
      this.supabase = createBrowserClient()
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    tenantId: string,
    conversation: Omit<ConversationInsert, 'tenant_id'>
  ): Promise<ConversationRow> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        ...conversation,
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return data
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationRow | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', conversationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get conversation: ${error.message}`)
    }

    return data
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    tenantId: string,
    conversationId: string,
    updates: ConversationUpdate
  ): Promise<ConversationRow> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    tenantId: string,
    conversationId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', conversationId)

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`)
    }
  }

  /**
   * Search conversations with advanced filtering
   */
  async searchConversations(
    tenantId: string,
    filters: SearchFilters = {}
  ): Promise<{
    conversations: (ConversationRow & { searchRank?: number })[]
    totalCount: number
  }> {
    const {
      query,
      platforms,
      sentiments,
      keywords,
      tags,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters

    // Use the custom search function for complex queries
    const { data, error } = await this.supabase.rpc('search_conversations', {
      p_tenant_id: tenantId,
      p_search_query: query || null,
      p_platforms: platforms || null,
      p_sentiments: sentiments || null,
      p_keywords: keywords || null,
      p_tags: tags || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      throw new Error(`Failed to search conversations: ${error.message}`)
    }

    // Get total count for pagination
    let query_builder = this.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    if (platforms?.length) {
      query_builder = query_builder.in('platform', platforms)
    }
    if (sentiments?.length) {
      query_builder = query_builder.in('sentiment', sentiments)
    }
    if (keywords?.length) {
      query_builder = query_builder.overlaps('keywords', keywords)
    }
    if (tags?.length) {
      query_builder = query_builder.overlaps('tags', tags)
    }
    if (startDate) {
      query_builder = query_builder.gte('timestamp', startDate)
    }
    if (endDate) {
      query_builder = query_builder.lte('timestamp', endDate)
    }

    const { count, error: countError } = await query_builder

    if (countError) {
      throw new Error(`Failed to get conversation count: ${countError.message}`)
    }

    return {
      conversations: data || [],
      totalCount: count || 0,
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ConversationStats> {
    const { data, error } = await this.supabase.rpc('get_conversation_stats', {
      p_tenant_id: tenantId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    })

    if (error) {
      throw new Error(`Failed to get conversation stats: ${error.message}`)
    }

    const stats = data?.[0]
    if (!stats) {
      return {
        totalConversations: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        platformDistribution: {},
        dailyCounts: {},
      }
    }

    return {
      totalConversations: Number(stats.total_conversations),
      positiveCount: Number(stats.positive_count),
      negativeCount: Number(stats.negative_count),
      neutralCount: Number(stats.neutral_count),
      platformDistribution: stats.platform_distribution || {},
      dailyCounts: stats.daily_counts || {},
    }
  }

  /**
   * Find similar conversations based on content
   */
  async findSimilarConversations(
    tenantId: string,
    conversationId: string,
    limit: number = 10
  ): Promise<SimilarConversation[]> {
    const { data, error } = await this.supabase.rpc('find_similar_conversations', {
      p_tenant_id: tenantId,
      p_conversation_id: conversationId,
      p_limit: limit,
    })

    if (error) {
      throw new Error(`Failed to find similar conversations: ${error.message}`)
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      content: item.content,
      author: item.author,
      platform: item.platform,
      timestamp: item.timestamp,
      similarityScore: item.similarity_score,
    }))
  }

  /**
   * Bulk insert conversations with deduplication
   */
  async bulkInsertConversations(
    conversations: ConversationInsert[]
  ): Promise<BulkInsertResult> {
    const { data, error } = await this.supabase.rpc('bulk_insert_conversations', {
      p_conversations: JSON.stringify(conversations),
    })

    if (error) {
      throw new Error(`Failed to bulk insert conversations: ${error.message}`)
    }

    const result = data?.[0]
    return {
      insertedCount: result?.inserted_count || 0,
      updatedCount: result?.updated_count || 0,
      skippedCount: result?.skipped_count || 0,
    }
  }

  /**
   * Get conversations by keyword
   */
  async getConversationsByKeyword(
    tenantId: string,
    keyword: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationRow[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .contains('keywords', [keyword])
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get conversations by keyword: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get conversations by platform
   */
  async getConversationsByPlatform(
    tenantId: string,
    platform: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationRow[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('platform', platform)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get conversations by platform: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(
    tenantId: string,
    limit: number = 50
  ): Promise<ConversationRow[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get recent conversations: ${error.message}`)
    }

    return data || []
  }

  /**
   * Add tags to a conversation
   */
  async addTags(
    tenantId: string,
    conversationId: string,
    tags: string[]
  ): Promise<ConversationRow> {
    // Get current tags
    const conversation = await this.getConversation(tenantId, conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const currentTags = conversation.tags || []
    const newTags = [...new Set([...currentTags, ...tags])]

    return this.updateConversation(tenantId, conversationId, {
      tags: newTags,
    })
  }

  /**
   * Remove tags from a conversation
   */
  async removeTags(
    tenantId: string,
    conversationId: string,
    tags: string[]
  ): Promise<ConversationRow> {
    // Get current tags
    const conversation = await this.getConversation(tenantId, conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const currentTags = conversation.tags || []
    const newTags = currentTags.filter(tag => !tags.includes(tag))

    return this.updateConversation(tenantId, conversationId, {
      tags: newTags,
    })
  }

  /**
   * Get all unique tags for a tenant
   */
  async getAllTags(tenantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('tags')
      .eq('tenant_id', tenantId)
      .not('tags', 'is', null)

    if (error) {
      throw new Error(`Failed to get tags: ${error.message}`)
    }

    const allTags = new Set<string>()
    data?.forEach(row => {
      if (row.tags) {
        row.tags.forEach(tag => allTags.add(tag))
      }
    })

    return Array.from(allTags).sort()
  }

  /**
   * Get conversation count by sentiment
   */
  async getSentimentCounts(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    let query = this.supabase
      .from('conversations')
      .select('sentiment')
      .eq('tenant_id', tenantId)
      .not('sentiment', 'is', null)

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get sentiment counts: ${error.message}`)
    }

    const counts: Record<string, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
    }

    data?.forEach(row => {
      if (row.sentiment) {
        counts[row.sentiment] = (counts[row.sentiment] || 0) + 1
      }
    })

    return counts
  }
}

export const conversationService = new ConversationService()