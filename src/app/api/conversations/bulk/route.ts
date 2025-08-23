import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/lib/services/conversation'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const { conversations } = await request.json()

    if (!Array.isArray(conversations)) {
      return NextResponse.json(
        { error: 'Conversations must be an array' },
        { status: 400 }
      )
    }

    // Add tenant_id to all conversations
    const conversationsWithTenant = conversations.map(conv => ({
      ...conv,
      tenant_id: profile.tenant_id,
    }))

    const result = await conversationService.bulkInsertConversations(
      conversationsWithTenant
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error bulk inserting conversations:', error)
    return NextResponse.json(
      { error: 'Failed to bulk insert conversations' },
      { status: 500 }
    )
  }
}