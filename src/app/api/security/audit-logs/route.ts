import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { securityService } from '@/lib/services/security';
import { logger } from '@/lib/utils/logger-server';

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

    // Check if user has admin role to view audit logs
    if (userTenant.role !== 'admin' && userTenant.role !== 'owner') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name') || undefined;
    const operation = searchParams.get('operation') as 'INSERT' | 'UPDATE' | 'DELETE' | undefined;
    const userId = searchParams.get('user_id') || undefined;
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined;
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get audit logs
    const { data: auditLogs, count } = await securityService.getAuditLogs(
      userTenant.tenant_id,
      {
        tableName,
        operation,
        userId,
        startDate,
        endDate,
        limit,
        offset
      }
    );

    // Log the audit log access
    await securityService.logSecurityEvent(
      userTenant.tenant_id,
      'audit_logs_accessed',
      'medium',
      'User accessed audit logs',
      {
        userId: user.id,
        filters: {
          tableName,
          operation,
          userId,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: auditLogs,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });

  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}