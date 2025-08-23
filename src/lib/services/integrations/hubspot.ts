import { IntegrationConfig, SyncResult } from '../data-integration';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

export interface HubSpotTicket {
  id: string;
  properties: {
    content: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: string;
    subject: string;
    source_type: string;
    createdate: string;
    hs_lastmodifieddate: string;
    hubspot_owner_id: string;
  };
  associations?: {
    contacts?: {
      results: Array<{ id: string }>;
    };
    companies?: {
      results: Array<{ id: string }>;
    };
  };
}

export interface HubSpotContact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    createdate: string;
  };
}

export interface HubSpotEngagement {
  id: string;
  properties: {
    hs_engagement_type: string;
    hs_body_preview: string;
    hs_timestamp: string;
    hubspot_owner_id: string;
  };
  associations?: {
    tickets?: {
      results: Array<{ id: string }>;
    };
    contacts?: {
      results: Array<{ id: string }>;
    };
  };
}

export class HubSpotIntegration {
  private supabase: ReturnType<typeof createClient<Database>>;
  private accessToken: string;
  private baseUrl = 'https://api.hubapi.com';

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
      // Sync tickets
      const ticketResult = await this.syncTickets(tenantId, lastSyncTime);
      result.recordsProcessed += ticketResult.recordsProcessed;
      result.recordsImported += ticketResult.recordsImported;
      result.errors.push(...ticketResult.errors);

      // Sync engagements (emails, calls, meetings)
      const engagementResult = await this.syncEngagements(tenantId, lastSyncTime);
      result.recordsProcessed += engagementResult.recordsProcessed;
      result.recordsImported += engagementResult.recordsImported;
      result.errors.push(...engagementResult.errors);

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
      const properties = [
        'content',
        'hs_pipeline_stage',
        'hs_ticket_priority',
        'subject',
        'source_type',
        'createdate',
        'hs_lastmodifieddate',
        'hubspot_owner_id'
      ];

      let url = `${this.baseUrl}/crm/v3/objects/tickets?properties=${properties.join(',')}&associations=contacts,companies&limit=100`;

      if (lastSyncTime) {
        const timestamp = lastSyncTime.getTime();
        url += `&filterGroups=[{"filters":[{"propertyName":"hs_lastmodifieddate","operator":"GTE","value":"${timestamp}"}]}]`;
      }

      let hasMore = true;
      let after = '';

      while (hasMore) {
        const requestUrl = after ? `${url}&after=${after}` : url;

        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tickets: HubSpotTicket[] = data.results || [];

        // Get associated contacts for context
        const contactIds = new Set<string>();
        tickets.forEach(ticket => {
          ticket.associations?.contacts?.results.forEach(contact => {
            contactIds.add(contact.id);
          });
        });

        const contacts = await this.getContacts(Array.from(contactIds));
        const contactMap = new Map(contacts.map(contact => [contact.id, contact]));

        for (const ticket of tickets) {
          try {
            result.recordsProcessed++;

            // Get primary contact
            const primaryContactId = ticket.associations?.contacts?.results[0]?.id;
            const primaryContact = primaryContactId ? contactMap.get(primaryContactId) : null;

            const conversation = {
              tenant_id: tenantId,
              content: `${ticket.properties.subject || 'No Subject'}\n\n${ticket.properties.content || 'No Content'}`,
              author: primaryContact ? 
                `${primaryContact.properties.firstname || ''} ${primaryContact.properties.lastname || ''}`.trim() || 
                primaryContact.properties.email || 'Unknown Contact' : 'Unknown Contact',
              platform: 'hubspot' as const,
              url: `https://app.hubspot.com/contacts/tickets/${ticket.id}`,
              external_id: ticket.id,
              timestamp: ticket.properties.createdate,
              keywords: [ticket.properties.source_type].filter(Boolean),
              tags: [
                `stage:${ticket.properties.hs_pipeline_stage}`,
                `priority:${ticket.properties.hs_ticket_priority}`,
                `source:${ticket.properties.source_type}`
              ].filter(Boolean),
              engagement_metrics: {
                stage: ticket.properties.hs_pipeline_stage,
                priority: ticket.properties.hs_ticket_priority,
                sourceType: ticket.properties.source_type,
                ownerId: ticket.properties.hubspot_owner_id,
                contactEmail: primaryContact?.properties.email,
                contactPhone: primaryContact?.properties.phone
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

        // Check for next page
        hasMore = !!data.paging?.next?.after;
        if (hasMore) {
          after = data.paging.next.after;
        }

        // Rate limiting - HubSpot has 100 requests per 10 seconds for most endpoints
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncEngagements(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      const engagementTypes = ['EMAIL', 'CALL', 'MEETING', 'NOTE'];

      for (const engagementType of engagementTypes) {
        const typeResult = await this.syncEngagementType(tenantId, engagementType, lastSyncTime);
        result.recordsProcessed += typeResult.recordsProcessed;
        result.recordsImported += typeResult.recordsImported;
        result.errors.push(...typeResult.errors);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncEngagementType(
    tenantId: string, 
    engagementType: string, 
    lastSyncTime?: Date
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      const properties = [
        'hs_engagement_type',
        'hs_body_preview',
        'hs_timestamp',
        'hubspot_owner_id'
      ];

      let url = `${this.baseUrl}/crm/v3/objects/${engagementType.toLowerCase()}s?properties=${properties.join(',')}&associations=contacts,tickets&limit=100`;

      if (lastSyncTime) {
        const timestamp = lastSyncTime.getTime();
        url += `&filterGroups=[{"filters":[{"propertyName":"hs_timestamp","operator":"GTE","value":"${timestamp}"}]}]`;
      }

      let hasMore = true;
      let after = '';

      while (hasMore) {
        const requestUrl = after ? `${url}&after=${after}` : url;

        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          // Skip if endpoint doesn't exist for this engagement type
          if (response.status === 404) {
            break;
          }
          throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const engagements: HubSpotEngagement[] = data.results || [];

        for (const engagement of engagements) {
          try {
            result.recordsProcessed++;

            // Find parent conversation if associated with a ticket
            let parentConversationId = null;
            const ticketId = engagement.associations?.tickets?.results[0]?.id;
            if (ticketId) {
              const { data: parentConversation } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('platform', 'hubspot')
                .eq('external_id', ticketId)
                .single();
              
              parentConversationId = parentConversation?.id;
            }

            const conversation = {
              tenant_id: tenantId,
              content: engagement.properties.hs_body_preview || `${engagementType} engagement`,
              author: 'HubSpot User', // Would need to fetch owner details
              platform: 'hubspot' as const,
              url: `https://app.hubspot.com/contacts/engagements/${engagement.id}`,
              external_id: `${engagementType.toLowerCase()}_${engagement.id}`,
              timestamp: new Date(parseInt(engagement.properties.hs_timestamp)).toISOString(),
              keywords: [engagementType.toLowerCase()],
              tags: [`type:${engagementType.toLowerCase()}`],
              parent_conversation_id: parentConversationId,
              engagement_metrics: {
                engagementType: engagementType,
                ownerId: engagement.properties.hubspot_owner_id
              },
              raw_data: engagement
            };

            const { error } = await this.supabase
              .from('conversations')
              .upsert(conversation, {
                onConflict: 'tenant_id,platform,external_id'
              });

            if (error) {
              result.errors.push(`Failed to import ${engagementType} ${engagement.id}: ${error.message}`);
            } else {
              result.recordsImported++;
            }
          } catch (error) {
            result.errors.push(`Error processing ${engagementType} ${engagement.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Check for next page
        hasMore = !!data.paging?.next?.after;
        if (hasMore) {
          after = data.paging.next.after;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async getContacts(contactIds: string[]): Promise<HubSpotContact[]> {
    if (contactIds.length === 0) return [];

    try {
      const properties = ['firstname', 'lastname', 'email', 'phone', 'createdate'];
      const url = `${this.baseUrl}/crm/v3/objects/contacts/batch/read`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: contactIds.map(id => ({ id })),
          properties
        })
      });

      if (!response.ok) {
        console.error(`Failed to fetch contacts: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('HubSpot connection test failed:', error);
      return false;
    }
  }
}