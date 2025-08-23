import { IntegrationConfig, SyncResult } from '../data-integration';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

export interface SalesforceCase {
  Id: string;
  Subject: string;
  Description: string;
  Status: string;
  Priority: string;
  Origin: string;
  ContactId: string;
  AccountId: string;
  CreatedDate: string;
  LastModifiedDate: string;
  CaseNumber: string;
  Type: string;
  Reason: string;
}

export interface SalesforceContact {
  Id: string;
  Name: string;
  Email: string;
  Phone: string;
  AccountId: string;
}

export interface SalesforceCaseComment {
  Id: string;
  ParentId: string;
  CommentBody: string;
  CreatedDate: string;
  CreatedById: string;
  IsPublished: boolean;
}

export class SalesforceIntegration {
  private supabase: ReturnType<typeof createClient<Database>>;
  private instanceUrl: string;
  private accessToken: string;

  constructor(
    integration: IntegrationConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    const { instanceUrl, accessToken } = integration.config;
    this.instanceUrl = instanceUrl;
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
      // Sync cases
      const caseResult = await this.syncCases(tenantId, lastSyncTime);
      result.recordsProcessed += caseResult.recordsProcessed;
      result.recordsImported += caseResult.recordsImported;
      result.errors.push(...caseResult.errors);

      // Sync case comments
      const commentResult = await this.syncCaseComments(tenantId, lastSyncTime);
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

  private async syncCases(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      let soql = `
        SELECT Id, Subject, Description, Status, Priority, Origin, ContactId, AccountId, 
               CreatedDate, LastModifiedDate, CaseNumber, Type, Reason,
               Contact.Name, Contact.Email, Account.Name
        FROM Case
      `;

      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        soql += ` WHERE LastModifiedDate > ${isoTime}`;
      }

      soql += ' ORDER BY LastModifiedDate DESC LIMIT 2000';

      const queryUrl = `${this.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(soql)}`;

      let nextRecordsUrl = queryUrl;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(nextRecordsUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Salesforce API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const cases: any[] = data.records || [];

        for (const caseRecord of cases) {
          try {
            result.recordsProcessed++;

            const conversation = {
              tenant_id: tenantId,
              content: `${caseRecord.Subject || 'No Subject'}\n\n${caseRecord.Description || 'No Description'}`,
              author: caseRecord.Contact?.Name || 'Unknown Contact',
              platform: 'salesforce' as const,
              url: `${this.instanceUrl}/${caseRecord.Id}`,
              external_id: caseRecord.Id,
              timestamp: caseRecord.CreatedDate,
              keywords: [caseRecord.Type, caseRecord.Reason].filter(Boolean),
              tags: [
                `status:${caseRecord.Status}`,
                `priority:${caseRecord.Priority}`,
                `origin:${caseRecord.Origin}`,
                `case-number:${caseRecord.CaseNumber}`
              ].filter(Boolean),
              engagement_metrics: {
                status: caseRecord.Status,
                priority: caseRecord.Priority,
                origin: caseRecord.Origin,
                caseNumber: caseRecord.CaseNumber,
                type: caseRecord.Type,
                reason: caseRecord.Reason,
                contactEmail: caseRecord.Contact?.Email,
                accountName: caseRecord.Account?.Name
              },
              raw_data: caseRecord
            };

            const { error } = await this.supabase
              .from('conversations')
              .upsert(conversation, {
                onConflict: 'tenant_id,platform,external_id'
              });

            if (error) {
              result.errors.push(`Failed to import case ${caseRecord.Id}: ${error.message}`);
            } else {
              result.recordsImported++;
            }
          } catch (error) {
            result.errors.push(`Error processing case ${caseRecord.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Check for next batch
        hasMore = !data.done && data.nextRecordsUrl;
        if (hasMore) {
          nextRecordsUrl = `${this.instanceUrl}${data.nextRecordsUrl}`;
        }

        // Rate limiting - Salesforce has various limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncCaseComments(tenantId: string, lastSyncTime?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      let soql = `
        SELECT Id, ParentId, CommentBody, CreatedDate, CreatedById, IsPublished,
               CreatedBy.Name
        FROM CaseComment
        WHERE IsPublished = true
      `;

      if (lastSyncTime) {
        const isoTime = lastSyncTime.toISOString();
        soql += ` AND CreatedDate > ${isoTime}`;
      }

      soql += ' ORDER BY CreatedDate DESC LIMIT 2000';

      const queryUrl = `${this.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(soql)}`;

      let nextRecordsUrl = queryUrl;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(nextRecordsUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Salesforce API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const comments: any[] = data.records || [];

        for (const comment of comments) {
          try {
            result.recordsProcessed++;

            // Find parent conversation (the case)
            const { data: parentConversation } = await this.supabase
              .from('conversations')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('platform', 'salesforce')
              .eq('external_id', comment.ParentId)
              .single();

            const conversation = {
              tenant_id: tenantId,
              content: comment.CommentBody,
              author: comment.CreatedBy?.Name || 'Unknown User',
              platform: 'salesforce' as const,
              url: `${this.instanceUrl}/${comment.ParentId}`,
              external_id: `comment_${comment.Id}`,
              timestamp: comment.CreatedDate,
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
              result.errors.push(`Failed to import comment ${comment.Id}: ${error.message}`);
            } else {
              result.recordsImported++;
            }
          } catch (error) {
            result.errors.push(`Error processing comment ${comment.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Check for next batch
        hasMore = !data.done && data.nextRecordsUrl;
        if (hasMore) {
          nextRecordsUrl = `${this.instanceUrl}${data.nextRecordsUrl}`;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
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
      const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Salesforce connection test failed:', error);
      return false;
    }
  }
}