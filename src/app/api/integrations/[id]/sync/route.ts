import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DataIntegrationService } from '@/lib/services/data-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get integration and verify ownership
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .eq('tenant_id', integration.tenant_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const integrationService = new DataIntegrationService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const syncResult = await integrationService.syncIntegration(params.id);

    return NextResponse.json({ syncResult });
  } catch (error) {
    console.error('Error syncing integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}