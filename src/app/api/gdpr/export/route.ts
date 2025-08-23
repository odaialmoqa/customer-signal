import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { securityService } from '@/lib/services/security';
import { serverLogger } from '@/lib/utils/logger-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for POST requests
          },
          remove() {
            // Not needed for POST requests
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userTenant, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (tenantError || !userTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if user already has a pending export request
    const { data: existingRequest, error: existingError } = await supabase
      .from('gdpr_export_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'data_export')
      .in('status', ['pending', 'processing'])
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw existingError;
    }

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'Export request already exists',
          message: 'You already have a pending data export request',
          requestId: existingRequest.id,
          status: existingRequest.status
        },
        { status: 409 }
      );
    }

    // Create GDPR export request
    const requestId = await securityService.createGDPRExportRequest(
      userTenant.tenant_id,
      user.id,
      'data_export'
    );

    logger.info('GDPR data export request created', {
      requestId,
      userId: user.id,
      tenantId: userTenant.tenant_id
    });

    return NextResponse.json({
      success: true,
      message: 'Data export request created successfully',
      requestId,
      estimatedCompletionTime: '24-48 hours'
    });

  } catch (error) {
    logger.error('Failed to create GDPR export request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for GET requests
          },
          remove() {
            // Not needed for GET requests
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userTenant, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (tenantError || !userTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get user's GDPR export requests
    const requests = await securityService.getGDPRExportRequests(userTenant.tenant_id);
    
    // Filter to only show current user's requests
    const userRequests = requests.filter(req => req.user_id === user.id);

    return NextResponse.json({
      success: true,
      data: userRequests
    });

  } catch (error) {
    logger.error('Failed to get GDPR export requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}