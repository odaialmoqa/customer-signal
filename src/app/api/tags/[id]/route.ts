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

    const tag = await tagService.getTag(params.id)
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({ tag })
  } catch (error) {
    console.error('Error fetching tag:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { name, description, color, parent_tag_id } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (color !== undefined) updates.color = color
    if (parent_tag_id !== undefined) updates.parent_tag_id = parent_tag_id

    const tag = await tagService.updateTag(params.id, updates)
    return NextResponse.json({ tag })
  } catch (error) {
    console.error('Error updating tag:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_tag_name_per_tenant')) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update tag' },
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

    await tagService.deleteTag(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}