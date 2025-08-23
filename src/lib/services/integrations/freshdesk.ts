import { IntegrationConfig, SyncResult } from '../data-integration';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

export interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  description_text: string;
  status: number;
  priority: number;
  type: string;
  source: number;
  requester_id: number;
  responder_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

export interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company_id: number;
  created_at: string;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  ticket_id: number;
  user_id: number;
  private: boolean;
  incoming: boolean;
  created_at: string;
  updated_at: string;
  attachments: Array<{
    id: number;
    name: string;
    content_type: string;
    size: number;
    attachment_url: string;
  }>;
}

export class FreshdeskIntegration {
  private supabase: ReturnType<typeof createClient<Database>>;
  private domain: string;
  private apiKey: string;
  private baseUrl: string;
  private authHeader: string;

  constructor(
    integration: IntegrationConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    const { domain, apiKey } = integration.config;
    this.domain = domain;
    this.apiKey = apiKey;
    this.baseUrl = `https://${domain}.freshdesk.com/api/v2`;
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;
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

  private async syncTickets(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      let url = `${this.baseUrl}/tickets?include=requester,company&per_page=100`;

      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        url += `&updated_since=${encodeURIComponent(isoTime)}`;
      }

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const requestUrl = `${url}&page=${page}`;

        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
        }

        const tickets: FreshdeskTicket[] = await response.json();

        if (tickets.length === 0) {
          hasMore = false;
          break;
        }

        // Get requester details for tickets
        const requesterIds = [...new Set(tickets.map(ticket => ticket.requester_id))];
        const requesters = await this.getContacts(requesterIds);
        const requesterMap = new Map(requesters.map(contact => [contact.id, contact]));

        for (const ticket of tickets) {
          try {
            result.recordsProcessed++;

            const requester = requesterMap.get(ticket.requester_id);
            const statusName = this.getStatusName(ticket.status);
            const priorityName = this.getPriorityName(ticket.priority);
            const sourceName = this.getSourceName(ticket.source);

            const conversation = {
              tenant_id: tenantId,
              content: `${ticket.subject}\n\n${ticket.description_text || ticket.description}`,
              author: requester?.name || requester?.email || 'Unknown Contact',
              platform: 'freshdesk' as const,
              url: `https://${this.domain}.freshdesk.com/a/tickets/${ticket.id}`,
              external_id: ticket.id.toString(),
              timestamp: ticket.created_at,
              keywords: ticket.tags,
              tags: [
                `status:${statusName}`,
                `priority:${priorityName}`,
                `source:${sourceName}`,
                `type:${ticket.type}`
              ].filter(Boolean),
              engagement_metrics: {
                status: statusName,
                priority: priorityName,
                source: sourceName,
                type: ticket.type,
                requesterId: ticket.requester_id,
                responderId: ticket.responder_id,
                companyId: ticket.company_id,
                requesterEmail: requester?.email,
                customFields: ticket.custom_fields
              },
              raw_data: ticket
            };

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

        page++;

        // Rate limiting - Freshdesk allows 1000 requests per hour
        await new Promise(resolve => setTimeout(resolve, 100));
      }

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
      // Get tickets that have been updated since last sync to check for new conversations
      let ticketsUrl = `${this.baseUrl}/tickets?per_page=100`;
      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        ticketsUrl += `&updated_since=${encodeURIComponent(isoTime)}`;
      }

      const ticketsResponse = await fetch(ticketsUrl, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketsResponse.ok) {
        throw new Error(`Freshdesk API error: ${ticketsResponse.status} ${ticketsResponse.statusText}`);
      }

      const tickets: FreshdeskTicket[] = await ticketsResponse.json();

      for (const ticket of tickets) {
        try {
          // Get conversations for this ticket
          const conversationsUrl = `${this.baseUrl}/tickets/${ticket.id}/conversations`;
          const conversationsResponse = await fetch(conversationsUrl, {
            headers: {
              'Authorization': this.authHeader,
              'Content-Type': 'application/json'
            }
          });

          if (!conversationsResponse.ok) {
            result.errors.push(`Failed to fetch conversations for ticket ${ticket.id}: ${conversationsResponse.status}`);
            continue;
          }

          const conversations: FreshdeskConversation[] = await conversationsResponse.json();

          for (const conversation of conversations) {
            try {
              result.recordsProcessed++;

              // Skip private conversations unless configured otherwise
              if (conversation.private) {
                continue;
              }

              // Find parent conversation (the ticket)
              const { data: parentConversation } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('platform', 'freshdesk')
                .eq('external_id', ticket.id.toString())
                .single();

              const conversationData = {
                tenant_id: tenantId,
                content: conversation.body_text || conversation.body,
                author: `User ${conversation.user_id}`, // Would need to fetch user details
                platform: 'freshdesk' as const,
                url: `https://${this.domain}.freshdesk.com/a/tickets/${ticket.id}`,
                external_id: `conversation_${conversation.id}`,
                timestamp: conversation.created_at,
                keywords: [],
                tags: [
                  'conversation',
                  conversation.incoming ? 'incoming' : 'outgoing'
                ],
                parent_conversation_id: parentConversation?.id,
                engagement_metrics: {
                  incoming: conversation.incoming,
                  private: conversation.private,
                  userId: conversation.user_id,
                  attachmentCount: conversation.attachments?.length || 0
                },
                raw_data: conversation
              };

              const { error } = await this.supabase
                .from('conversations')
                .upsert(conversationData, {
                  onConflict: 'tenant_id,platform,external_id'
                });

              if (error) {
                result.errors.push(`Failed to import conversation ${conversation.id}: ${error.message}`);
              } else {
                result.recordsImported++;
              }
            } catch (error) {
              result.errors.push(`Error processing conversation ${conversation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          result.errors.push(`Error processing conversations for ticket ${ticket.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async getContacts(contactIds: number[]): Promise<FreshdeskContact[]> {
    if (contactIds.length === 0) return [];

    const contacts: FreshdeskContact[] = [];

    for (const contactId of contactIds) {
      try {
        const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const contact: FreshdeskContact = await response.json();
          contacts.push(contact);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error fetching contact ${contactId}:`, error);
      }
    }

    return contacts;
  }

  private getStatusName(status: number): string {
    const statusMap: Record<number, string> = {
      2: 'Open',
      3: 'Pending',
      4: 'Resolved',
      5: 'Closed'
    };
    return statusMap[status] || 'Unknown';
  }

  private getPriorityName(priority: number): string {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Urgent'
    };
    return priorityMap[priority] || 'Unknown';
  }

  private getSourceName(source: number): string {
    const sourceMap: Record<number, string> = {
      1: 'Email',
      2: 'Portal',
      3: 'Phone',
      4: 'Chat',
      7: 'Feedback Widget',
      8: 'Outbound Email',
      9: 'Ecommerce',
      10: 'Bot'
    };
    return sourceMap[source] || 'Unknown';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets?per_page=1`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Freshdesk connection test failed:', error);
      return false;
    }
  }
}