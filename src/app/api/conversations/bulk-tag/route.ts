import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/services/tag'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationIds, tagIds } = body

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json({ error: 'Conversation IDs are required' }, { status: 400 })
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'Tag IDs are required' }, { status: 400 })
    }

    const count = await tagService.bulkTagConversations(
      { conversationIds, tagIds },
      user.id
    )

    return NextResponse.json({ 
      success: true, 
      taggedCount: count,
      message: `Successfully tagged ${count} conversation-tag combinations`
    })
  } catch (error) {
    console.error('Error bulk tagging conversations:', error)
    return NextResponse.json(
      { error: 'Failed to bulk tag conversations' },
      { status: 500 }
    )
  }
}