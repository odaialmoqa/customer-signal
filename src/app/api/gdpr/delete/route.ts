import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { securityService } from '@/lib/services/security';
import { logger } from '@/lib/utils/logger-server';

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

    // Parse request body
    const body = await request.json();
    const { confirmationCode } = body;

    // Validate confirmation code (in a real implementation, this would be sent via email)
    const expectedCode = `DELETE-${user.id.slice(-8).toUpperCase()}`;
    if (confirmationCode !== expectedCode) {
      return NextResponse.json(
        { 
          error: 'Invalid confirmation code',
          message: 'Please enter the correct confirmation code sent to your email'
        },
        { status: 400 }
      );
    }

    // Check if user already has a pending deletion request
    const { data: existingRequest, error: existingError } = await supabase
      .from('gdpr_export_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'data_deletion')
      .in('status', ['pending', 'processing'])
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw existingError;
    }

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'Deletion request already exists',
          message: 'You already have a pending data deletion request',
          requestId: existingRequest.id,
          status: existingRequest.status
        },
        { status: 409 }
      );
    }

    // Create GDPR deletion request
    const requestId = await securityService.createGDPRExportRequest(
      userTenant.tenant_id,
      user.id,
      'data_deletion'
    );

    // Log critical security event for data deletion request
    await securityService.logSecurityEvent(
      userTenant.tenant_id,
      'gdpr_deletion_requested',
      'critical',
      'User requested complete data deletion',
      {
        userId: user.id,
        requestId,
        confirmationCode,
        userEmail: user.email
      }
    );

    logger.warn('GDPR data deletion request created', {
      requestId,
      userId: user.id,
      tenantId: userTenant.tenant_id,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion request created successfully',
      requestId,
      warning: 'This action cannot be undone. All your data will be permanently deleted.',
      estimatedCompletionTime: '7-30 days'
    });

  } catch (error) {
    logger.error('Failed to create GDPR deletion request:', error);
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

    // Return the confirmation code that would be sent via email
    // In a real implementation, this would be sent via email and not returned via API
    const confirmationCode = `DELETE-${user.id.slice(-8).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      message: 'In a production environment, a confirmation code would be sent to your email',
      confirmationCode, // Remove this in production
      warning: 'Data deletion is irreversible and will permanently remove all your data'
    });

  } catch (error) {
    logger.error('Failed to get deletion confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}