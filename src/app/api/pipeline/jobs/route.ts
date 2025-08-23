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
    const status = searchParams.get('status') as any
    const type = searchParams.get('type') as any
    const priority = searchParams.get('priority') as any
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    const jobs = await pipelineService.getJobs({
      status,
      type,
      priority,
      tenantId: userTenant?.tenant_id,
      limit,
      offset
    })

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Pipeline jobs API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processing jobs' },
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

    const body = await request.json()
    const { type, data, priority = 'medium' } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Type and data are required' },
        { status: 400 }
      )
    }

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    const job = await pipelineService.createJob({
      type,
      data,
      priority,
      tenant_id: userTenant?.tenant_id || null
    })

    return NextResponse.json({ job }, { status: 201 })

  } catch (error) {
    console.error('Pipeline job creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create processing job' },
      { status: 500 }
    )
  }
}