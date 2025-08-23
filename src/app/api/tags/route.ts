import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/services/tag'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeHierarchy = searchParams.get('hierarchy') === 'true'
    const search = searchParams.get('search')
    const popular = searchParams.get('popular') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (search) {
      const tags = await tagService.searchTags(search, limit)
      return NextResponse.json({ tags })
    }

    if (popular) {
      const tags = await tagService.getPopularTags(limit)
      return NextResponse.json({ tags })
    }

    const tags = await tagService.getTags(includeHierarchy)
    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
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

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, color, parent_tag_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    const tag = await tagService.createTag({
      tenant_id: profile.tenant_id,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#6B7280',
      parent_tag_id: parent_tag_id || null,
      created_by: user.id,
      is_system_tag: false
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_tag_name_per_tenant')) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}