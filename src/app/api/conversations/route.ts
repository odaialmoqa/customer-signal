import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/lib/services/conversation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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
    const query = searchParams.get('q')
    const platforms = searchParams.get('platforms')?.split(',')
    const sentiments = searchParams.get('sentiments')?.split(',') as ('positive' | 'negative' | 'neutral')[]
    const keywords = searchParams.get('keywords')?.split(',')
    const tags = searchParams.get('tags')?.split(',')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await conversationService.searchConversations(profile.tenant_id, {
      query: query || undefined,
      platforms,
      sentiments,
      keywords,
      tags,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const conversation = await conversationService.createConversation(
      profile.tenant_id,
      body
    )

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}