import { NextRequest, NextResponse } from 'next/server'
import { reportService } from '@/lib/services/report'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant ID from user metadata or session
    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    if (type === 'configs') {
      const configs = await reportService.getReportConfigs(tenantId)
      return NextResponse.json({ configs })
    } else if (type === 'generated') {
      const reports = await reportService.getGeneratedReports(tenantId)
      return NextResponse.json({ reports })
    } else if (type === 'templates') {
      const templates = await reportService.getReportTemplates()
      return NextResponse.json({ templates })
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
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

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const body = await request.json()
    const { action, ...data } = body

    if (action === 'create-config') {
      const config = await reportService.createReportConfig({
        ...data,
        tenantId
      })
      return NextResponse.json({ config })
    } else if (action === 'generate') {
      const { configId, format } = data
      const jobId = await reportService.generateReport(configId, format)
      return NextResponse.json({ jobId })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing report request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}