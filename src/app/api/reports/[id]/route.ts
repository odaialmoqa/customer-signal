import { NextRequest, NextResponse } from 'next/server'
import { reportService } from '@/lib/services/report'
import { reportScheduler } from '@/lib/services/report-scheduler'
import { createClient } from '@/lib/supabase/server'

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

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    if (type === 'status') {
      // Get report generation job status
      const status = await reportService.getReportStatus(params.id)
      return NextResponse.json({ status })
    } else if (type === 'schedule-history') {
      // Get schedule history for a config
      const history = await reportScheduler.getScheduleHistory(params.id)
      return NextResponse.json({ history })
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching report details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report details' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { action, ...data } = body

    if (action === 'update-config') {
      const config = await reportService.updateReportConfig(params.id, data)
      return NextResponse.json({ config })
    } else if (action === 'update-schedule') {
      await reportScheduler.updateSchedule(params.id, data.schedule)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
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

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    if (type === 'config') {
      await reportService.deleteReportConfig(params.id)
      return NextResponse.json({ success: true })
    } else if (type === 'schedule') {
      await reportScheduler.removeSchedule(params.id)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}