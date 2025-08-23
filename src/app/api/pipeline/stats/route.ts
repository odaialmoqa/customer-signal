import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pipelineService } from '@/lib/services/pipeline'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'

    // Get queue statistics
    const queueStats = await pipelineService.getQueueStats()

    // Get processing metrics
    const metrics = await pipelineService.getProcessingMetrics(timeRange)

    // Get recent jobs for the user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    const recentJobs = await pipelineService.getJobs({
      tenantId: userTenant?.tenant_id,
      limit: 10
    })

    return NextResponse.json({
      queue_stats: queueStats,
      metrics,
      recent_jobs: recentJobs,
      time_range: timeRange
    })

  } catch (error) {
    console.error('Pipeline stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline statistics' },
      { status: 500 }
    )
  }
}