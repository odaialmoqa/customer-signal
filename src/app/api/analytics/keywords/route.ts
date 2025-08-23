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
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
    const minFrequency = parseInt(searchParams.get('min_frequency') || '1')
    const type = searchParams.get('type') || 'frequency' // 'frequency' or 'performance'

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      platforms
    }

    if (type === 'performance') {
      const performance = await analyticsService.getKeywordPerformance(
        profile.tenant_id,
        filters
      )
      return NextResponse.json(performance)
    } else {
      const frequency = await analyticsService.getKeywordFrequency(
        profile.tenant_id,
        filters,
        minFrequency
      )
      return NextResponse.json(frequency)
    }
  } catch (error) {
    console.error('Error getting keyword data:', error)
    return NextResponse.json(
      { error: 'Failed to get keyword data' },
      { status: 500 }
    )
  }
}