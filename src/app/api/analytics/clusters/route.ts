import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/services/analytics'
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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const minClusterSize = parseInt(searchParams.get('min_cluster_size') || '3')
    const similarityThreshold = parseFloat(searchParams.get('similarity_threshold') || '0.3')

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined
    }

    const clusters = await analyticsService.getConversationClusters(
      profile.tenant_id,
      filters,
      minClusterSize,
      similarityThreshold
    )

    return NextResponse.json(clusters)
  } catch (error) {
    console.error('Error getting conversation clusters:', error)
    return NextResponse.json(
      { error: 'Failed to get conversation clusters' },
      { status: 500 }
    )
  }
}