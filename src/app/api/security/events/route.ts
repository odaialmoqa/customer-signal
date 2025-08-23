import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { securityService } from '@/lib/services/security';
import { serverLogger as logger } from '@/lib/utils/logger-server';

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
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (tenantError || !userTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if user has admin role to view security events
    if (userTenant.role !== 'admin' && userTenant.role !== 'owner') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event_type') || undefined;
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | undefined;
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined;
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get security events
    const { data: securityEvents, count } = await securityService.getSecurityEvents(
      userTenant.tenant_id,
      {
        eventType,
        severity,
        startDate,
        endDate,
        limit,
        offset
      }
    );

    // Log the security events access
    await securityService.logSecurityEvent(
      userTenant.tenant_id,
      'security_events_accessed',
      'low',
      'User accessed security events',
      {
        userId: user.id,
        filters: {
          eventType,
          severity,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: securityEvents,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });

  } catch (error) {
    logger.error('Failed to get security events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}