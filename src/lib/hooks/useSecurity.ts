import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/types/database';
import { logger } from '@/lib/utils/logger';

type SecurityEvent = Database['public']['Tables']['security_events']['Row'];
type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
type GDPRRequest = Database['public']['Tables']['gdpr_export_requests']['Row'];

interface SecurityHookState {
  securityEvents: SecurityEvent[];
  auditLogs: AuditLog[];
  gdprRequests: GDPRRequest[];
  loading: boolean;
  error: string | null;
}

interface SecurityFilters {
  eventType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tableName?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export function useSecurity() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  
  const [state, setState] = useState<SecurityHookState>({
    securityEvents: [],
    auditLogs: [],
    gdprRequests: [],
    loading: false,
    error: null
  });

  const [tenantId, setTenantId] = useState<string | null>(null);

  // Get user's tenant ID
  useEffect(() => {
    async function getUserTenant() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          logger.error('Failed to get user tenant:', error);
          return;
        }

        setTenantId(data.tenant_id);
      } catch (error) {
        logger.error('Error getting user tenant:', error);
      }
    }

    getUserTenant();
  }, [user, supabase]);

  // Fetch security events
  const fetchSecurityEvents = useCallback(async (filters: SecurityFilters = {}) => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/security/events?' + new URLSearchParams({
        ...(filters.eventType && { event_type: filters.eventType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.startDate && { start_date: filters.startDate.toISOString() }),
        ...(filters.endDate && { end_date: filters.endDate.toISOString() }),
        ...(filters.limit && { limit: filters.limit.toString() }),
        ...(filters.offset && { offset: filters.offset.toString() })
      }));

      if (!response.ok) {
        throw new Error('Failed to fetch security events');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        securityEvents: result.data,
        loading: false
      }));
    } catch (error) {
      logger.error('Failed to fetch security events:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [tenantId]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (filters: SecurityFilters = {}) => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/security/audit-logs?' + new URLSearchParams({
        ...(filters.tableName && { table_name: filters.tableName }),
        ...(filters.operation && { operation: filters.operation }),
        ...(filters.startDate && { start_date: filters.startDate.toISOString() }),
        ...(filters.endDate && { end_date: filters.endDate.toISOString() }),
        ...(filters.limit && { limit: filters.limit.toString() }),
        ...(filters.offset && { offset: filters.offset.toString() })
      }));

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        auditLogs: result.data,
        loading: false
      }));
    } catch (error) {
      logger.error('Failed to fetch audit logs:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [tenantId]);

  // Fetch GDPR requests
  const fetchGDPRRequests = useCallback(async () => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/gdpr/export');

      if (!response.ok) {
        throw new Error('Failed to fetch GDPR requests');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        gdprRequests: result.data,
        loading: false
      }));
    } catch (error) {
      logger.error('Failed to fetch GDPR requests:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [tenantId]);

  // Create GDPR data export request
  const requestDataExport = useCallback(async () => {
    if (!tenantId) return null;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/gdpr/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create export request');
      }

      const result = await response.json();
      
      // Refresh GDPR requests
      await fetchGDPRRequests();
      
      setState(prev => ({ ...prev, loading: false }));
      
      return result.requestId;
    } catch (error) {
      logger.error('Failed to create data export request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
      return null;
    }
  }, [tenantId, fetchGDPRRequests]);

  // Create GDPR data deletion request
  const requestDataDeletion = useCallback(async (confirmationCode: string) => {
    if (!tenantId) return null;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create deletion request');
      }

      const result = await response.json();
      
      // Refresh GDPR requests
      await fetchGDPRRequests();
      
      setState(prev => ({ ...prev, loading: false }));
      
      return result.requestId;
    } catch (error) {
      logger.error('Failed to create data deletion request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
      return null;
    }
  }, [tenantId, fetchGDPRRequests]);

  // Get deletion confirmation code
  const getDeletionConfirmationCode = useCallback(async () => {
    try {
      const response = await fetch('/api/gdpr/delete');

      if (!response.ok) {
        throw new Error('Failed to get confirmation code');
      }

      const result = await response.json();
      return result.confirmationCode;
    } catch (error) {
      logger.error('Failed to get deletion confirmation code:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      return null;
    }
  }, []);

  // Real-time subscriptions for security events
  useEffect(() => {
    if (!tenantId) return;

    const securityEventsSubscription = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            securityEvents: [payload.new as SecurityEvent, ...prev.securityEvents]
          }));
        }
      )
      .subscribe();

    const auditLogsSubscription = supabase
      .channel('audit-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            auditLogs: [payload.new as AuditLog, ...prev.auditLogs]
          }));
        }
      )
      .subscribe();

    const gdprRequestsSubscription = supabase
      .channel('gdpr-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gdpr_export_requests',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Refresh GDPR requests when any change occurs
          fetchGDPRRequests();
        }
      )
      .subscribe();

    return () => {
      securityEventsSubscription.unsubscribe();
      auditLogsSubscription.unsubscribe();
      gdprRequestsSubscription.unsubscribe();
    };
  }, [tenantId, supabase, fetchGDPRRequests]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    tenantId,
    fetchSecurityEvents,
    fetchAuditLogs,
    fetchGDPRRequests,
    requestDataExport,
    requestDataDeletion,
    getDeletionConfirmationCode,
    clearError
  };
}