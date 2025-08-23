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
    const sentiments = searchParams.get('sentiments')?.split(',').filter(Boolean) as ('positive' | 'negative' | 'neutral')[]
    const type = searchParams.get('type') || 'distribution' // 'distribution' or 'patterns'

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      keywords,
      sentiments
    }

    if (type === 'patterns') {
      const minCorrelation = parseFloat(searchParams.get('min_correlation') || '0.3')
      const patterns = await analyticsService.getCrossPlatformPatterns(
        profile.tenant_id,
        filters,
        minCorrelation
      )
      return NextResponse.json(patterns)
    } else {
      const distribution = await analyticsService.getPlatformDistribution(
        profile.tenant_id,
        filters
      )
      return NextResponse.json(distribution)
    }
  } catch (error) {
    console.error('Error getting platform data:', error)
    return NextResponse.json(
      { error: 'Failed to get platform data' },
      { status: 500 }
    )
  }
}