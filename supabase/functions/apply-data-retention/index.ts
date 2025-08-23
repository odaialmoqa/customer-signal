import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting data retention policy application...');

    // Apply data retention policies using the database function
    const { data: affectedRecords, error: retentionError } = await supabaseClient.rpc('apply_data_retention');

    if (retentionError) {
      throw retentionError;
    }

    console.log(`Data retention applied successfully. ${affectedRecords} records affected.`);

    // Get summary of retention policies applied
    const { data: policies, error: policiesError } = await supabaseClient
      .from('data_retention_policies')
      .select('tenant_id, table_name, retention_days, policy_type')
      .eq('is_active', true);

    if (policiesError) {
      console.error('Failed to get retention policies summary:', policiesError);
    }

    // Log the retention application as a system event
    const retentionSummary = {
      total_affected_records: affectedRecords,
      policies_applied: policies?.length || 0,
      execution_time: new Date().toISOString(),
      policies: policies || []
    };

    // Log security events for each tenant that had data affected
    const tenantIds = [...new Set(policies?.map(p => p.tenant_id) || [])];
    
    for (const tenantId of tenantIds) {
      try {
        await supabaseClient.rpc('log_security_event', {
          p_tenant_id: tenantId,
          p_event_type: 'data_retention_applied',
          p_severity: 'medium',
          p_description: 'Automated data retention policies applied',
          p_metadata: retentionSummary
        });
      } catch (error) {
        console.error(`Failed to log security event for tenant ${tenantId}:`, error);
      }
    }

    // Clean up expired GDPR export requests
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: expiredRequests, error: cleanupError } = await supabaseClient
      .from('gdpr_export_requests')
      .delete()
      .lt('expires_at', thirtyDaysAgo.toISOString())
      .select('id, tenant_id');

    if (cleanupError) {
      console.error('Failed to clean up expired GDPR requests:', cleanupError);
    } else {
      console.log(`Cleaned up ${expiredRequests?.length || 0} expired GDPR requests`);
    }

    // Clean up old audit logs based on retention policies
    const auditRetentionDays = 2555; // 7 years default
    const auditCutoffDate = new Date();
    auditCutoffDate.setDate(auditCutoffDate.getDate() - auditRetentionDays);

    const { data: deletedAuditLogs, error: auditCleanupError } = await supabaseClient
      .from('audit_logs')
      .delete()
      .lt('timestamp', auditCutoffDate.toISOString())
      .select('id');

    if (auditCleanupError) {
      console.error('Failed to clean up old audit logs:', auditCleanupError);
    } else {
      console.log(`Cleaned up ${deletedAuditLogs?.length || 0} old audit log entries`);
    }

    // Clean up old security events based on retention policies
    const securityRetentionDays = 1095; // 3 years default
    const securityCutoffDate = new Date();
    securityCutoffDate.setDate(securityCutoffDate.getDate() - securityRetentionDays);

    const { data: deletedSecurityEvents, error: securityCleanupError } = await supabaseClient
      .from('security_events')
      .delete()
      .lt('timestamp', securityCutoffDate.toISOString())
      .select('id');

    if (securityCleanupError) {
      console.error('Failed to clean up old security events:', securityCleanupError);
    } else {
      console.log(`Cleaned up ${deletedSecurityEvents?.length || 0} old security event entries`);
    }

    const response = {
      success: true,
      summary: {
        data_retention: {
          affected_records: affectedRecords,
          policies_applied: policies?.length || 0
        },
        cleanup: {
          expired_gdpr_requests: expiredRequests?.length || 0,
          old_audit_logs: deletedAuditLogs?.length || 0,
          old_security_events: deletedSecurityEvents?.length || 0
        },
        execution_time: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error applying data retention policies:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/* 
 * This function should be scheduled to run periodically (e.g., daily) using Supabase cron jobs.
 * Example cron configuration in supabase/config.toml:
 * 
 * [functions.apply-data-retention]
 * schedule = "0 2 * * *"  # Run daily at 2 AM UTC
 */