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
    const lookbackDays = parseInt(searchParams.get('lookback_days') || '7')
    const comparisonDays = parseInt(searchParams.get('comparison_days') || '14')
    const minGrowthRate = parseFloat(searchParams.get('min_growth_rate') || '2.0')

    const themes = await analyticsService.getEmergingThemes(
      profile.tenant_id,
      lookbackDays,
      comparisonDays,
      minGrowthRate
    )

    return NextResponse.json(themes)
  } catch (error) {
    console.error('Error getting emerging themes:', error)
    return NextResponse.json(
      { error: 'Failed to get emerging themes' },
      { status: 500 }
    )
  }
}