import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ProcessingJob {
  id: string
  type: 'sentiment_analysis' | 'content_normalization' | 'trend_analysis'
  data: any
  priority: 'low' | 'medium' | 'high'
  tenant_id: string
  created_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface ProcessingResult {
  job_id: string
  result: any
  error?: string
  processing_time_ms: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { job_id, batch_size = 10 } = await req.json()

    console.log(`Processing pipeline request - Job ID: ${job_id}, Batch size: ${batch_size}`)

    // Get pending jobs from the queue
    const { data: jobs, error: jobsError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batch_size)

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: ProcessingResult[] = []

    // Process each job
    for (const job of jobs) {
      const startTime = Date.now()
      
      try {
        // Mark job as processing
        await supabase
          .from('processing_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', job.id)

        let result: any

        switch (job.type) {
          case 'sentiment_analysis':
            result = await processSentimentAnalysis(job.data, supabase)
            break
          case 'content_normalization':
            result = await processContentNormalization(job.data, supabase)
            break
          case 'trend_analysis':
            result = await processTrendAnalysis(job.data, supabase)
            break
          default:
            throw new Error(`Unknown job type: ${job.type}`)
        }

        const processingTime = Date.now() - startTime

        // Mark job as completed
        await supabase
          .from('processing_jobs')
          .update({ 
            status: 'completed', 
            result: result,
            processing_time_ms: processingTime,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          result,
          processing_time_ms: processingTime
        })

        console.log(`Job ${job.id} completed in ${processingTime}ms`)

      } catch (error) {
        const processingTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Mark job as failed
        await supabase
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error: errorMessage,
            processing_time_ms: processingTime,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          result: null,
          error: errorMessage,
          processing_time_ms: processingTime
        })

        console.error(`Job ${job.id} failed: ${errorMessage}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Batch processing completed',
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Pipeline processing error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processSentimentAnalysis(data: any, supabase: any) {
  const { conversation_ids, provider = 'local' } = data

  // Call sentiment analysis service
  const { data: sentimentResults, error } = await supabase.functions.invoke('analyze-sentiment', {
    body: { conversation_ids, provider, batch: true }
  })

  if (error) {
    throw new Error(`Sentiment analysis failed: ${error.message}`)
  }

  return sentimentResults
}

async function processContentNormalization(data: any, supabase: any) {
  const { conversation_ids } = data

  // Get conversations to normalize
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, content, platform, metadata')
    .in('id', conversation_ids)

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`)
  }

  const normalizedResults = []

  for (const conversation of conversations) {
    // Normalize content based on platform
    const normalized = await normalizeContent(conversation)
    
    // Update conversation with normalized data
    await supabase
      .from('conversations')
      .update({ 
        normalized_content: normalized.content,
        extracted_keywords: normalized.keywords,
        metadata: { ...conversation.metadata, normalized: true }
      })
      .eq('id', conversation.id)

    normalizedResults.push({
      conversation_id: conversation.id,
      normalized: normalized
    })
  }

  return normalizedResults
}

async function processTrendAnalysis(data: any, supabase: any) {
  const { tenant_id, time_range, keywords } = data

  // Analyze trends for the specified time range
  const { data: trends, error } = await supabase.functions.invoke('analyze-trends', {
    body: { tenant_id, time_range, keywords }
  })

  if (error) {
    throw new Error(`Trend analysis failed: ${error.message}`)
  }

  return trends
}

async function normalizeContent(conversation: any) {
  // Basic content normalization
  const content = conversation.content || ''
  
  // Extract keywords using simple regex (in production, use NLP)
  const keywords = content
    .toLowerCase()
    .match(/\b\w{3,}\b/g)
    ?.filter((word, index, arr) => arr.indexOf(word) === index)
    ?.slice(0, 10) || []

  // Clean and normalize content
  const normalizedContent = content
    .replace(/\s+/g, ' ')
    .trim()

  return {
    content: normalizedContent,
    keywords,
    word_count: normalizedContent.split(' ').length,
    platform: conversation.platform
  }
}