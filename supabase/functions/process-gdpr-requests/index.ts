import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GDPRRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  request_type: 'data_export' | 'data_deletion';
  status: string;
}

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

    // Get pending GDPR requests
    const { data: requests, error: requestsError } = await supabaseClient
      .from('gdpr_export_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(10);

    if (requestsError) {
      throw requestsError;
    }

    const results = [];

    for (const request of requests || []) {
      try {
        // Update status to processing
        await supabaseClient
          .from('gdpr_export_requests')
          .update({ status: 'processing' })
          .eq('id', request.id);

        if (request.request_type === 'data_export') {
          await processDataExport(supabaseClient, request);
        } else if (request.request_type === 'data_deletion') {
          await processDataDeletion(supabaseClient, request);
        }

        results.push({
          requestId: request.id,
          status: 'completed',
          type: request.request_type
        });

      } catch (error) {
        console.error(`Failed to process GDPR request ${request.id}:`, error);
        
        // Update status to failed
        await supabaseClient
          .from('gdpr_export_requests')
          .update({ 
            status: 'failed',
            metadata: { error: error.message }
          })
          .eq('id', request.id);

        results.push({
          requestId: request.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing GDPR requests:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processDataExport(supabaseClient: any, request: GDPRRequest) {
  // Export user data using the database function
  const { data: exportData, error: exportError } = await supabaseClient.rpc('export_user_data', {
    p_user_id: request.user_id,
    p_tenant_id: request.tenant_id
  });

  if (exportError) {
    throw exportError;
  }

  // In a real implementation, you would:
  // 1. Upload the export data to secure storage (e.g., Supabase Storage)
  // 2. Generate a secure, time-limited download URL
  // 3. Send an email notification to the user
  
  // For now, we'll simulate this process
  const exportFileName = `gdpr-export-${request.id}-${Date.now()}.json`;
  
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('gdpr-exports')
    .upload(exportFileName, JSON.stringify(exportData, null, 2), {
      contentType: 'application/json'
    });

  if (uploadError) {
    throw uploadError;
  }

  // Generate signed URL (valid for 7 days)
  const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
    .from('gdpr-exports')
    .createSignedUrl(exportFileName, 7 * 24 * 60 * 60); // 7 days

  if (signedUrlError) {
    throw signedUrlError;
  }

  // Update request with completion details
  await supabaseClient
    .from('gdpr_export_requests')
    .update({
      status: 'completed',
      export_url: signedUrlData.signedUrl,
      completed_at: new Date().toISOString(),
      metadata: {
        export_file: exportFileName,
        export_size: JSON.stringify(exportData).length
      }
    })
    .eq('id', request.id);

  // Log security event
  await supabaseClient.rpc('log_security_event', {
    p_tenant_id: request.tenant_id,
    p_event_type: 'gdpr_export_completed',
    p_severity: 'high',
    p_description: 'GDPR data export completed successfully',
    p_metadata: {
      request_id: request.id,
      user_id: request.user_id,
      export_file: exportFileName
    }
  });

  console.log(`GDPR data export completed for request ${request.id}`);
}

async function processDataDeletion(supabaseClient: any, request: GDPRRequest) {
  // Delete user data using the database function
  const { error: deleteError } = await supabaseClient.rpc('delete_user_data', {
    p_user_id: request.user_id,
    p_tenant_id: request.tenant_id
  });

  if (deleteError) {
    throw deleteError;
  }

  // Update request with completion details
  await supabaseClient
    .from('gdpr_export_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        deletion_completed: true,
        deleted_at: new Date().toISOString()
      }
    })
    .eq('id', request.id);

  // Log security event
  await supabaseClient.rpc('log_security_event', {
    p_tenant_id: request.tenant_id,
    p_event_type: 'gdpr_deletion_completed',
    p_severity: 'critical',
    p_description: 'GDPR data deletion completed successfully',
    p_metadata: {
      request_id: request.id,
      user_id: request.user_id
    }
  });

  console.log(`GDPR data deletion completed for request ${request.id}`);
}