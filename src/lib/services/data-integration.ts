import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export type IntegrationType = 'zendesk' | 'salesforce' | 'hubspot' | 'intercom' | 'freshdesk' | 'csv';
export type IntegrationStatus = 'active' | 'error' | 'paused';

export interface IntegrationConfig {
  id: string;
  tenantId: string;
  type: IntegrationType;
  name: string;
  config: Record<string, any>;
  status: IntegrationStatus;
  lastSync?: Date;
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsImported: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  validationErrors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface FieldMapping {
  [sourceField: string]: string;
}

export interface PlatformConfig {
  type: IntegrationType;
  credentials: Record<string, string>;
  settings: Record<string, any>;
}

export class DataIntegrationService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async createIntegration(
    tenantId: string,
    type: IntegrationType,
    name: string,
    config: Record<string, any>,
    userId: string
  ): Promise<IntegrationConfig> {
    const { data, error } = await this.supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        type,
        name,
        config,
        created_by: userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    return this.mapIntegrationFromDb(data);
  }

  async getIntegrations(tenantId: string): Promise<IntegrationConfig[]> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return data.map(this.mapIntegrationFromDb);
  }

  async updateIntegration(
    integrationId: string,
    updates: Partial<Pick<IntegrationConfig, 'name' | 'config' | 'status'>>
  ): Promise<IntegrationConfig> {
    const { data, error } = await this.supabase
      .from('integrations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return this.mapIntegrationFromDb(data);
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId);

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }
  }

  async testConnection(config: PlatformConfig): Promise<boolean> {
    try {
      switch (config.type) {
        case 'zendesk':
          return await this.testZendeskConnection(config.credentials);
        case 'salesforce':
          return await this.testSalesforceConnection(config.credentials);
        case 'hubspot':
          return await this.testHubSpotConnection(config.credentials);
        case 'intercom':
          return await this.testIntercomConnection(config.credentials);
        case 'freshdesk':
          return await this.testFreshdeskConnection(config.credentials);
        default:
          throw new Error(`Unsupported integration type: ${config.type}`);
      }
    } catch (error) {
      console.error(`Connection test failed for ${config.type}:`, error);
      return false;
    }
  }

  async syncIntegration(integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegrationById(integrationId);
    
    try {
      let result: SyncResult;
      
      switch (integration.type) {
        case 'zendesk':
          result = await this.syncZendesk(integration);
          break;
        case 'salesforce':
          result = await this.syncSalesforce(integration);
          break;
        case 'hubspot':
          result = await this.syncHubSpot(integration);
          break;
        case 'intercom':
          result = await this.syncIntercom(integration);
          break;
        case 'freshdesk':
          result = await this.syncFreshdesk(integration);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      // Update last sync time
      await this.updateIntegration(integrationId, {
        status: result.success ? 'active' : 'error'
      });

      await this.supabase
        .from('integrations')
        .update({
          last_sync: new Date().toISOString(),
          error_message: result.success ? null : result.errors.join('; ')
        })
        .eq('id', integrationId);

      return result;
    } catch (error) {
      await this.updateIntegration(integrationId, {
        status: 'error'
      });

      await this.supabase
        .from('integrations')
        .update({
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', integrationId);

      throw error;
    }
  }

  private async getIntegrationById(integrationId: string): Promise<IntegrationConfig> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }

    return this.mapIntegrationFromDb(data);
  }

  private mapIntegrationFromDb(data: any): IntegrationConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      type: data.type,
      name: data.name,
      config: data.config,
      status: data.status,
      lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
      errorMessage: data.error_message
    };
  }

  // Platform-specific connection tests
  private async testZendeskConnection(credentials: Record<string, string>): Promise<boolean> {
    const { subdomain, email, apiToken } = credentials;
    const auth = Buffer.from(`${email}/token:${apiToken}`).toString('base64');
    
    const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  }

  private async testSalesforceConnection(credentials: Record<string, string>): Promise<boolean> {
    const { instanceUrl, accessToken } = credentials;
    
    const response = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  }

  private async testHubSpotConnection(credentials: Record<string, string>): Promise<boolean> {
    const { accessToken } = credentials;
    
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  }

  private async testIntercomConnection(credentials: Record<string, string>): Promise<boolean> {
    const { accessToken } = credentials;
    
    const response = await fetch('https://api.intercom.io/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return response.ok;
  }

  private async testFreshdeskConnection(credentials: Record<string, string>): Promise<boolean> {
    const { domain, apiKey } = credentials;
    const auth = Buffer.from(`${apiKey}:X`).toString('base64');
    
    const response = await fetch(`https://${domain}.freshdesk.com/api/v2/tickets?per_page=1`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  }

  // Platform-specific sync methods
  private async syncZendesk(integration: IntegrationConfig): Promise<SyncResult> {
    const { ZendeskIntegration } = await import('./integrations/zendesk');
    const zendeskIntegration = new ZendeskIntegration(
      integration,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return await zendeskIntegration.sync(integration.tenantId, integration.lastSync);
  }

  private async syncSalesforce(integration: IntegrationConfig): Promise<SyncResult> {
    const { SalesforceIntegration } = await import('./integrations/salesforce');
    const salesforceIntegration = new SalesforceIntegration(
      integration,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return await salesforceIntegration.sync(integration.tenantId, integration.lastSync);
  }

  private async syncHubSpot(integration: IntegrationConfig): Promise<SyncResult> {
    const { HubSpotIntegration } = await import('./integrations/hubspot');
    const hubspotIntegration = new HubSpotIntegration(
      integration,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return await hubspotIntegration.sync(integration.tenantId, integration.lastSync);
  }

  private async syncIntercom(integration: IntegrationConfig): Promise<SyncResult> {
    const { IntercomIntegration } = await import('./integrations/intercom');
    const intercomIntegration = new IntercomIntegration(
      integration,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return await intercomIntegration.sync(integration.tenantId, integration.lastSync);
  }

  private async syncFreshdesk(integration: IntegrationConfig): Promise<SyncResult> {
    const { FreshdeskIntegration } = await import('./integrations/freshdesk');
    const freshdeskIntegration = new FreshdeskIntegration(
      integration,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return await freshdeskIntegration.sync(integration.tenantId, integration.lastSync);
  }
}