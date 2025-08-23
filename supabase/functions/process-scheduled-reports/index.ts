import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Processing scheduled reports...')

    // Get pending scheduled reports
    const { data: pendingReports, error: fetchError } = await supabaseClient
      .from('scheduled_reports')
      .select(`
        *,
        report_configs (*)
      `)
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching pending reports:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingReports?.length || 0} pending reports`)

    const results = []

    for (const scheduledReport of pendingReports || []) {
      try {
        console.log(`Processing scheduled report: ${scheduledReport.id}`)
        
        const config = scheduledReport.report_configs
        if (!config) {
          console.error(`No config found for scheduled report: ${scheduledReport.id}`)
          continue
        }

        // Create generation job
        const { data: job, error: jobError } = await supabaseClient
          .from('report_generation_jobs')
          .insert({
            report_config_id: config.id,
            tenant_id: config.tenant_id,
            status: 'queued',
            progress: 0
          })
          .select()
          .single()

        if (jobError) {
          console.error(`Failed to create job for report ${scheduledReport.id}:`, jobError)
          continue
        }

        console.log(`Created job ${job.id} for scheduled report ${scheduledReport.id}`)

        // In a real implementation, this would trigger the actual report generation
        // For now, we'll simulate it by updating the job status
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Simulate report generation completion
        const { error: updateJobError } = await supabaseClient
          .from('report_generation_jobs')
          .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        if (updateJobError) {
          console.error(`Failed to update job ${job.id}:`, updateJobError)
        }

        // Create generated report record
        const { data: generatedReport, error: reportError } = await supabaseClient
          .from('generated_reports')
          .insert({
            job_id: job.id,
            config_id: config.id,
            tenant_id: config.tenant_id,
            format: config.format[0] || 'pdf',
            status: 'completed',
            file_path: `/reports/${config.format[0] || 'pdf'}/scheduled_${Date.now()}.${config.format[0] || 'pdf'}`,
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            download_count: 0
          })
          .select()
          .single()

        if (reportError) {
          console.error(`Failed to create generated report for job ${job.id}:`, reportError)
        } else {
          console.log(`Created generated report ${generatedReport.id}`)
        }

        // Calculate next run time
        const nextRunTime = calculateNextRunTime(scheduledReport.schedule_config)

        // Update scheduled report
        const { error: updateError } = await supabaseClient
          .from('scheduled_reports')
          .update({
            next_run_at: nextRunTime.toISOString(),
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduledReport.id)

        if (updateError) {
          console.error(`Failed to update scheduled report ${scheduledReport.id}:`, updateError)
        }

        results.push({
          scheduledReportId: scheduledReport.id,
          jobId: job.id,
          generatedReportId: generatedReport?.id,
          nextRunTime: nextRunTime.toISOString(),
          status: 'success'
        })

        // Send email notification if recipients are configured
        if (config.recipients && config.recipients.length > 0 && generatedReport) {
          console.log(`Sending email notification for report ${generatedReport.id}`)
          // In a real implementation, this would call an email service
          // For now, we'll just log it
        }

      } catch (error) {
        console.error(`Error processing scheduled report ${scheduledReport.id}:`, error)
        
        // Log the error
        await supabaseClient
          .from('scheduled_report_errors')
          .insert({
            scheduled_report_id: scheduledReport.id,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            occurred_at: new Date().toISOString()
          })

        results.push({
          scheduledReportId: scheduledReport.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`Processed ${results.length} scheduled reports`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-scheduled-reports function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextRunTime(schedule: any): Date {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)
  
  let nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)
  
  // If the time has already passed today, move to the next occurrence
  if (nextRun <= now) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        break
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3)
        break
    }
  }

  // Adjust for specific day requirements
  if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
    const targetDay = schedule.dayOfWeek
    const currentDay = nextRun.getDay()
    const daysToAdd = (targetDay - currentDay + 7) % 7
    nextRun.setDate(nextRun.getDate() + daysToAdd)
  }

  if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
    nextRun.setDate(schedule.dayOfMonth)
    
    // If the day has already passed this month, move to next month
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1)
      nextRun.setDate(schedule.dayOfMonth)
    }
  }

  return nextRun
}