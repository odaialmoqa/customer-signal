import { IntegrationConfig, SyncResult } from '../data-integration';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  requester_id: number;
  assignee_id: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  custom_fields: Array<{
    id: number;
    value: any;
  }>;
}

export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface ZendeskComment {
  id: number;
  ticket_id: number;
  author_id: number;
  body: string;
  created_at: string;
  public: boolean;
}

export class ZendeskIntegration {
  private supabase: ReturnType<typeof createClient<Database>>;
  private subdomain: string;
  private email: string;
  private apiToken: string;
  private baseUrl: string;
  private authHeader: string;

  constructor(
    integration: IntegrationConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    const { subdomain, email, apiToken } = integration.config;
    this.subdomain = subdomain;
    this.email = email;
    this.apiToken = apiToken;
    this.baseUrl = `https://${subdomain}.zendesk.com/api/v2`;
    this.authHeader = `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString('base64')}`;
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
      // Sync tickets
      const ticketResult = await this.syncTickets(tenantId, lastSyncTime);
      result.recordsProcessed += ticketResult.recordsProcessed;
      result.recordsImported += ticketResult.recordsImported;
      result.errors.push(...ticketResult.errors);

      // Sync comments
      const commentResult = await this.syncComments(tenantId, lastSyncTime);
      result.recordsProcessed += commentResult.recordsProcessed;
      result.recordsImported += commentResult.recordsImported;
      result.errors.push(...commentResult.errors);

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncTickets(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      let url = `${this.baseUrl}/tickets.json?include=users`;
      
      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        url += `&start_time=${encodeURIComponent(isoTime)}`;
      }

      let hasMore = true;
      let nextPage = url;

      while (hasMore) {
        const response = await fetch(nextPage, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Zendesk API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tickets: ZendeskTicket[] = data.tickets || [];
        const users: ZendeskUser[] = data.users || [];

        // Create user lookup map
        const userMap = new Map(users.map(user => [user.id, user]));

        for (const ticket of tickets) {
          try {
            result.recordsProcessed++;

            const requester = userMap.get(ticket.requester_id);
            const assignee = userMap.get(ticket.assignee_id);

            // Convert ticket to conversation format
            const conversation = {
              tenant_id: tenantId,
              content: `${ticket.subject}\n\n${ticket.description}`,
              author: requester?.name || 'Unknown',
              platform: 'zendesk' as const,
              url: `https://${this.subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
              external_id: ticket.id.toString(),
              timestamp: ticket.created_at,
              keywords: ticket.tags,
              tags: [`status:${ticket.status}`, `priority:${ticket.priority}`],
              engagement_metrics: {
                status: ticket.status,
                priority: ticket.priority,
                assignee: assignee?.name
              },
              raw_data: ticket
            };

            // Insert or update conversation
            const { error } = await this.supabase
              .from('conversations')
              .upsert(conversation, {
                onConflict: 'tenant_id,platform,external_id'
              });

            if (error) {
              result.errors.push(`Failed to import ticket ${ticket.id}: ${error.message}`);
            } else {
              result.recordsImported++;
            }
          } catch (error) {
            result.errors.push(`Error processing ticket ${ticket.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Check for next page
        hasMore = data.has_more && data.next_page;
        if (hasMore) {
          nextPage = data.next_page;
        }

        // Rate limiting - Zendesk allows 700 requests per minute
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncComments(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      // Get tickets that have been updated since last sync
      let ticketsUrl = `${this.baseUrl}/tickets.json`;
      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        ticketsUrl += `?start_time=${encodeURIComponent(isoTime)}`;
      }

      const ticketsResponse = await fetch(ticketsUrl, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketsResponse.ok) {
        throw new Error(`Zendesk API error: ${ticketsResponse.status} ${ticketsResponse.statusText}`);
      }

      const ticketsData = await ticketsResponse.json();
      const tickets: ZendeskTicket[] = ticketsData.tickets || [];

      for (const ticket of tickets) {
        try {
          // Get comments for this ticket
          const commentsUrl = `${this.baseUrl}/tickets/${ticket.id}/comments.json`;
          const commentsResponse = await fetch(commentsUrl, {
            headers: {
              'Authorization': this.authHeader,
              'Content-Type': 'application/json'
            }
          });

          if (!commentsResponse.ok) {
            result.errors.push(`Failed to fetch comments for ticket ${ticket.id}: ${commentsResponse.status}`);
            continue;
          }

          const commentsData = await commentsResponse.json();
          const comments: ZendeskComment[] = commentsData.comments || [];

          for (const comment of comments) {
            try {
              result.recordsProcessed++;

              // Skip private comments unless configured otherwise
              if (!comment.public) {
                continue;
              }

              // Find parent conversation (the ticket)
              const { data: parentConversation } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('platform', 'zendesk')
                .eq('external_id', ticket.id.toString())
                .single();

              const conversation = {
                tenant_id: tenantId,
                content: comment.body,
                author: `User ${comment.author_id}`, // Would need to fetch user details
                platform: 'zendesk' as const,
                url: `https://${this.subdomain}.zendesk.com/agent/tickets/${ticket.id}#comment_${comment.id}`,
                external_id: `comment_${comment.id}`,
                timestamp: comment.created_at,
                keywords: [],
                tags: ['comment'],
                parent_conversation_id: parentConversation?.id,
                raw_data: comment
              };

              const { error } = await this.supabase
                .from('conversations')
                .upsert(conversation, {
                  onConflict: 'tenant_id,platform,external_id'
                });

              if (error) {
                result.errors.push(`Failed to import comment ${comment.id}: ${error.message}`);
              } else {
                result.recordsImported++;
              }
            } catch (error) {
              result.errors.push(`Error processing comment ${comment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          result.errors.push(`Error processing comments for ticket ${ticket.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await fetch(`${this.baseUrl}/users/me.json`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Zendesk connection test failed:', error);
      return false;
    }
  }
}