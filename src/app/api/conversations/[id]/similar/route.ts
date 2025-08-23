import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/lib/services/conversation'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    const similarConversations = await conversationService.findSimilarConversations(
      profile.tenant_id,
      params.id,
      limit
    )

    return NextResponse.json(similarConversations)
  } catch (error) {
    console.error('Error finding similar conversations:', error)
    return NextResponse.json(
      { error: 'Failed to find similar conversations' },
      { status: 500 }
    )
  }
}