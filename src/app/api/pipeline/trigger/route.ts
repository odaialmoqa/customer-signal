import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pipelineService } from '@/lib/services/pipeline'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, ...params } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Trigger type is required' },
        { status: 400 }
      )
    }

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    const tenantId = userTenant?.tenant_id

    switch (type) {
      case 'sentiment_batch':
        const { conversation_ids, provider = 'local' } = params
        if (!conversation_ids || !Array.isArray(conversation_ids)) {
          return NextResponse.json(
            { error: 'conversation_ids array is required for sentiment batch' },
            { status: 400 }
          )
        }
        await pipelineService.triggerSentimentBatch(conversation_ids, provider)
        break

      case 'trend_analysis':
        const { time_range = '24h' } = params
        await pipelineService.triggerTrendAnalysis(tenantId, time_range)
        break

      case 'data_cleanup':
        await pipelineService.triggerDataCleanup(tenantId)
        break

      default:
        return NextResponse.json(
          { error: `Unknown trigger type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: `${type} triggered successfully`,
      type,
      tenant_id: tenantId
    })

  } catch (error) {
    console.error('Pipeline trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger pipeline operation' },
      { status: 500 }
    )
  }
}