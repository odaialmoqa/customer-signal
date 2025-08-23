import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/services/tag'
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

    const tags = await tagService.getConversationTags(params.id)
    const suggestions = await tagService.getTagSuggestions(params.id)
    
    return NextResponse.json({ tags, suggestions })
  } catch (error) {
    console.error('Error fetching conversation tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation tags' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tagIds } = body

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'Tag IDs are required' }, { status: 400 })
    }

    const conversationTags = await tagService.tagConversation(params.id, tagIds, user.id)
    return NextResponse.json({ conversationTags }, { status: 201 })
  } catch (error) {
    console.error('Error tagging conversation:', error)
    return NextResponse.json(
      { error: 'Failed to tag conversation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tagIds = searchParams.get('tagIds')?.split(',') || []

    if (tagIds.length === 0) {
      return NextResponse.json({ error: 'Tag IDs are required' }, { status: 400 })
    }

    await tagService.untagConversation(params.id, tagIds)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing tags from conversation:', error)
    return NextResponse.json(
      { error: 'Failed to remove tags from conversation' },
      { status: 500 }
    )
  }
}