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
    const { conversationId, tagId, action } = body

    if (!conversationId || !tagId || !action) {
      return NextResponse.json({ 
        error: 'conversationId, tagId, and action are required' 
      }, { status: 400 })
    }

    if (action === 'accept') {
      await tagService.acceptTagSuggestion(conversationId, tagId, user.id)
      return NextResponse.json({ 
        success: true, 
        message: 'Tag suggestion accepted and applied' 
      })
    } else if (action === 'reject') {
      await tagService.rejectTagSuggestion(conversationId, tagId)
      return NextResponse.json({ 
        success: true, 
        message: 'Tag suggestion rejected' 
      })
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "accept" or "reject"' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling tag suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to handle tag suggestion' },
      { status: 500 }
    )
  }
}