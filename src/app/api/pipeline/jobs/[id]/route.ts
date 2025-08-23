import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pipelineService } from '@/lib/services/pipeline'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await pipelineService.getJobById(params.id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if user has access to this job's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (job.tenant_id && job.tenant_id !== userTenant?.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ job })

  } catch (error) {
    console.error('Pipeline job fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch processing job' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, result, error: jobError } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Check if job exists and user has access
    const job = await pipelineService.getJobById(params.id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (job.tenant_id && job.tenant_id !== userTenant?.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await pipelineService.updateJobStatus(params.id, status, result, jobError)

    const updatedJob = await pipelineService.getJobById(params.id)
    return NextResponse.json({ job: updatedJob })

  } catch (error) {
    console.error('Pipeline job update error:', error)
    return NextResponse.json(
      { error: 'Failed to update processing job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if job exists and user has access
    const job = await pipelineService.getJobById(params.id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (job.tenant_id && job.tenant_id !== userTenant?.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await pipelineService.deleteJob(params.id)

    return NextResponse.json({ message: 'Job deleted successfully' })

  } catch (error) {
    console.error('Pipeline job deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete processing job' },
      { status: 500 }
    )
  }
}