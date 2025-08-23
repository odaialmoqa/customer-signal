import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { KeywordService } from '@/lib/services/keyword';
import { UpdateKeywordRequest } from '@/lib/types/keyword';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'User not associated with a tenant' }, { status: 400 });
    }

    const keywordService = new KeywordService();
    const keyword = await keywordService.getKeyword(id, profile.tenant_id);

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    return NextResponse.json({ keyword });
  } catch (error) {
    console.error('Error fetching keyword:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'User not associated with a tenant' }, { status: 400 });
    }

    const body: UpdateKeywordRequest = await request.json();
    
    const keywordService = new KeywordService();
    const keyword = await keywordService.updateKeyword(id, profile.tenant_id, body);

    return NextResponse.json({ keyword });
  } catch (error) {
    console.error('Error updating keyword:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'User not associated with a tenant' }, { status: 400 });
    }

    const keywordService = new KeywordService();
    await keywordService.deleteKeyword(id, profile.tenant_id);

    return NextResponse.json({ message: 'Keyword deleted successfully' });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}