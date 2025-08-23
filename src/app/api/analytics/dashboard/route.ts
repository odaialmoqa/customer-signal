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
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean)
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
    const sentiments = searchParams.get('sentiments')?.split(',').filter(Boolean) as ('positive' | 'negative' | 'neutral')[]

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      keywords,
      platforms,
      sentiments
    }

    const metrics = await analyticsService.getDashboardMetrics(
      profile.tenant_id,
      filters
    )

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error getting dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to get dashboard metrics' },
      { status: 500 }
    )
  }
}