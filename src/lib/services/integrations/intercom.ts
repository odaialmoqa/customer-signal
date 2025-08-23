import { IntegrationConfig, SyncResult } from '../data-integration';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

export interface IntercomConversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  waiting_since: number;
  snoozed_until: number;
  source: {
    type: string;
    id: string;
    delivered_as: string;
    subject: string;
    body: string;
    author: {
      type: string;
      id: string;
      name: string;
      email: string;
    };
  };
  contacts: {
    contacts: Array<{
      type: string;
      id: string;
      name: string;
      email: string;
    }>;
  };
  teammates: {
    teammates: Array<{
      type: string;
      id: string;
      name: string;
      email: string;
    }>;
  };
  state: string;
  priority: string;
  tags: {
    tags: Array<{
      type: string;
      id: string;
      name: string;
    }>;
  };
}

export interface IntercomConversationPart {
  id: string;
  type: string;
  part_type: string;
  body: string;
  created_at: number;
  updated_at: number;
  notified_at: number;
  author: {
    type: string;
    id: string;
    name: string;
    email: string;
  };
}

export class IntercomIntegration {
  private supabase: ReturnType<typeof createClient<Database>>;
  private accessToken: string;
  private baseUrl = 'https://api.intercom.io';

  constructor(
    integration: IntegrationConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    const { accessToken } = integration.config;
    this.accessToken = accessToken;
  }

  async sync(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      // Sync conversations
      const conversationResult = await this.syncConversations(tenantId, lastSyncTime);
      result.recordsProcessed += conversationResult.recordsProcessed;
      result.recordsImported += conversationResult.recordsImported;
      result.errors.push(...conversationResult.errors);

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncConversations(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      let url = `${this.baseUrl}/conversations?per_page=150&display_as=plaintext`;

      if (lastSyncTime) {
        const timestamp = Math.floor(lastSyncTime.getTime() / 1000);
        url += `&created_since=${timestamp}`;
      }

      let hasMore = true;
      let startingAfter = '';

      while (hasMore) {
        const requestUrl = startingAfter ? `${url}&starting_after=${startingAfter}` : url;

        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Intercom-Version': '2.10'
          }
        });

        if (!response.ok) {
          throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const conversations: IntercomConversation[] = data.conversations || [];

        for (const conversation of conversations) {
          try {
            result.recordsProcessed++;

            // Import the main conversation
            await this.importConversation(tenantId, conversation);
            result.recordsImported++;

            // Import conversation parts (replies)
            const partsResult = await this.syncConversationParts(tenantId, conversation.id);
            result.recordsProcessed += partsResult.recordsProcessed;
            result.recordsImported += partsResult.recordsImported;
            result.errors.push(...partsResult.errors);

          } catch (error) {
            result.errors.push(`Error processing conversation ${conversation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Check for next page
        hasMore = data.pages && data.pages.next;
        if (hasMore && data.pages.next.starting_after) {
          startingAfter = data.pages.next.starting_after;
        } else {
          hasMore = false;
        }

        // Rate limiting - Intercom allows 1000 requests per minute
        await new Promise(resolve => setTimeout(resolve, 60));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async importConversation(tenantId: string, conversation: IntercomConversation): Promise<void> {
    const primaryContact = conversation.contacts?.contacts[0];
    const assignedTeammate = conversation.teammates?.teammates[0];

    const content = conversation.source?.body || conversation.title || 'No content';
    const subject = conversation.source?.subject || conversation.title || 'No subject';

    const conversationData = {
      tenant_id: tenantId,
      content: `${subject}\n\n${content}`,
      author: primaryContact?.name || primaryContact?.email || 'Unknown Contact',
      platform: 'intercom' as const,
      url: `https://app.intercom.com/a/inbox/conversation/${conversation.id}`,
      external_id: conversation.id,
      timestamp: new Date(conversation.created_at * 1000).toISOString(),
      keywords: conversation.tags?.tags.map(tag => tag.name) || [],
      tags: [
        `state:${conversation.state}`,
        `priority:${conversation.priority}`,
        `source:${conversation.source?.type}`
      ].filter(Boolean),
      engagement_metrics: {
        state: conversation.state,
        priority: conversation.priority,
        sourceType: conversation.source?.type,
        contactEmail: primaryContact?.email,
        assignedTo: assignedTeammate?.name,
        waitingSince: conversation.waiting_since ? new Date(conversation.waiting_since * 1000).toISOString() : null,
        snoozedUntil: conversation.snoozed_until ? new Date(conversation.snoozed_until * 1000).toISOString() : null
      },
      raw_data: conversation
    };

    const { error } = await this.supabase
      .from('conversations')
      .upsert(conversationData, {
        onConflict: 'tenant_id,platform,external_id'
      });

    if (error) {
      throw new Error(`Failed to import conversation ${conversation.id}: ${error.message}`);
    }
  }

  private async syncConversationParts(tenantId: string, conversationId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      const url = `${this.baseUrl}/conversations/${conversationId}?display_as=plaintext`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Intercom-Version': '2.10'
        }
      });

      if (!response.ok) {
        throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const parts: IntercomConversationPart[] = data.conversation_parts?.conversation_parts || [];

      // Find parent conversation
      const { data: parentConversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('platform', 'intercom')
        .eq('external_id', conversationId)
        .single();

      for (const part of parts) {
        try {
          result.recordsProcessed++;

          // Skip certain part types that aren't user messages
          if (part.part_type === 'assignment' || part.part_type === 'close') {
            continue;
          }

          const partData = {
            tenant_id: tenantId,
            content: part.body,
            author: part.author?.name || part.author?.email || 'Unknown User',
            platform: 'intercom' as const,
            url: `https://app.intercom.com/a/inbox/conversation/${conversationId}`,
            external_id: `part_${part.id}`,
            timestamp: new Date(part.created_at * 1000).toISOString(),
            keywords: [],
            tags: [`part-type:${part.part_type}`],
            parent_conversation_id: parentConversation?.id,
            engagement_metrics: {
              partType: part.part_type,
              authorType: part.author?.type,
              notifiedAt: part.notified_at ? new Date(part.notified_at * 1000).toISOString() : null
            },
            raw_data: part
          };

          const { error } = await this.supabase
            .from('conversations')
            .upsert(partData, {
              onConflict: 'tenant_id,platform,external_id'
            });

          if (error) {
            result.errors.push(`Failed to import conversation part ${part.id}: ${error.message}`);
          } else {
            result.recordsImported++;
          }
        } catch (error) {
          result.errors.push(`Error processing conversation part ${part.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Intercom-Version': '2.10'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Intercom connection test failed:', error);
      return false;
    }
  }
}