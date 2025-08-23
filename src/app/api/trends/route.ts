import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trendAnalysisService } from '@/lib/services/trend-analysis'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeRangeStart = searchParams.get('start')
    const timeRangeEnd = searchParams.get('end')
    const platforms = searchParams.get('platforms')?.split(',')
    const keywords = searchParams.get('keywords')?.split(',')
    const minConversationCount = parseInt(searchParams.get('minConversationCount') || '5')
    const minRelevanceScore = parseFloat(searchParams.get('minRelevanceScore') || '0.3')
    const includeEmergingTrends = searchParams.get('includeEmergingTrends') !== 'false'
    const maxResults = parseInt(searchParams.get('maxResults') || '20')

    const options = {
      timeRange: timeRangeStart && timeRangeEnd ? {
        start: timeRangeStart,
        end: timeRangeEnd
      } : undefined,
      platforms,
      keywords,
      minConversationCount,
      minRelevanceScore,
      includeEmergingTrends,
      maxResults
    }

    const result = await trendAnalysisService.analyzeTrends(profile.tenant_id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing trends:', error)
    return NextResponse.json(
      { error: 'Failed to analyze trends' },
      { status: 500 }
    )
  }
}