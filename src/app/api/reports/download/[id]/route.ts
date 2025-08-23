import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Get the generated report
    const { data: report, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check if report has expired
    if (new Date(report.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Report has expired' }, { status: 410 })
    }

    // Check if file exists
    const filePath = join(process.cwd(), 'public', report.file_path)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // Update download count
      await supabase
        .from('generated_reports')
        .update({ download_count: report.download_count + 1 })
        .eq('id', params.id)

      // Set appropriate headers based on file format
      const headers: Record<string, string> = {
        'Content-Length': fileBuffer.length.toString(),
      }

      switch (report.format) {
        case 'pdf':
          headers['Content-Type'] = 'application/pdf'
          headers['Content-Disposition'] = `attachment; filename="${report.id}.pdf"`
          break
        case 'excel':
          headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          headers['Content-Disposition'] = `attachment; filename="${report.id}.xlsx"`
          break
        case 'csv':
          headers['Content-Type'] = 'text/csv'
          headers['Content-Disposition'] = `attachment; filename="${report.id}.csv"`
          break
        default:
          headers['Content-Type'] = 'application/octet-stream'
      }

      return new NextResponse(fileBuffer, { headers })
    } catch (fileError) {
      console.error('Error reading report file:', fileError)
      return NextResponse.json({ error: 'Report file not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error downloading report:', error)
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    )
  }
}