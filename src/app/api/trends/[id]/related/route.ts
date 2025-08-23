import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trendAnalysisService } from '@/lib/services/trend-analysis'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    const relatedConversations = await trendAnalysisService.getRelatedConversations(
      profile.tenant_id,
      params.id,
      limit
    )

    return NextResponse.json({ conversations: relatedConversations })
  } catch (error) {
    console.error('Error getting related conversations:', error)
    return NextResponse.json(
      { error: 'Failed to get related conversations' },
      { status: 500 }
    )
  }
}