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

    const stats = await tagService.getTagStats()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching tag stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag statistics' },
      { status: 500 }
    )
  }
}