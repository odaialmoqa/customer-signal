import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface BatchSentimentRequest {
  conversation_ids: string[]
  provider?: 'local' | 'google' | 'aws' | 'azure'
  batch_size?: number
  priority?: 'low' | 'medium' | 'high'
}

interface SentimentResult {
  conversation_id: string
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  emotions?: Record<string, number>
  keywords?: string[]
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { 
      conversation_ids, 
      provider = 'local', 
      batch_size = 50,
      priority = 'medium'
    }: BatchSentimentRequest = await req.json()

    console.log(`Batch sentiment analysis - ${conversation_ids.length} conversations, provider: ${provider}`)

    if (!conversation_ids || conversation_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No conversation IDs provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process conversations in batches
    const results: SentimentResult[] = []
    const batches = chunkArray(conversation_ids, batch_size)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} conversations)`)

      try {
        const batchResults = await processBatch(batch, provider, supabase)
        results.push(...batchResults)

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error)
        
        // Add failed results for this batch
        const failedResults = batch.map(id => ({
          conversation_id: id,
          sentiment: 'neutral' as const,
          confidence: 0,
          error: error instanceof Error ? error.message : 'Batch processing failed'
        }))
        
        results.push(...failedResults)
      }
    }

    // Update conversations with sentiment results
    await updateConversationsWithSentiment(results, supabase)

    // Log batch processing metrics
    await logBatchMetrics(results, provider, supabase)

    const successCount = results.filter(r => !r.error).length
    const errorCount = results.filter(r => r.error).length

    return new Response(
      JSON.stringify({
        message: 'Batch sentiment analysis completed',
        total_processed: results.length,
        successful: successCount,
        failed: errorCount,
        provider,
        results: results.slice(0, 10) // Return first 10 results as sample
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Batch sentiment analysis error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processBatch(
  conversationIds: string[], 
  provider: string, 
  supabase: any
): Promise<SentimentResult[]> {
  
  // Fetch conversations
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, content, platform')
    .in('id', conversationIds)

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`)
  }

  if (!conversations || conversations.length === 0) {
    throw new Error('No conversations found for the provided IDs')
  }

  const results: SentimentResult[] = []

  // Process each conversation
  for (const conversation of conversations) {
    try {
      const sentimentResult = await analyzeSentiment(conversation, provider)
      results.push({
        conversation_id: conversation.id,
        ...sentimentResult
      })
    } catch (error) {
      console.error(`Failed to analyze sentiment for conversation ${conversation.id}:`, error)
      results.push({
        conversation_id: conversation.id,
        sentiment: 'neutral',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Analysis failed'
      })
    }
  }

  return results
}

async function analyzeSentiment(conversation: any, provider: string) {
  const content = conversation.content || ''
  
  if (!content.trim()) {
    return {
      sentiment: 'neutral' as const,
      confidence: 0,
      keywords: []
    }
  }

  switch (provider) {
    case 'local':
      return analyzeLocalSentiment(content)
    case 'google':
      return analyzeGoogleSentiment(content)
    case 'aws':
      return analyzeAwsSentiment(content)
    case 'azure':
      return analyzeAzureSentiment(content)
    default:
      throw new Error(`Unknown sentiment provider: ${provider}`)
  }
}

function analyzeLocalSentiment(content: string) {
  // Simple rule-based sentiment analysis for local processing
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'disappointing', 'useless']
  
  const words = content.toLowerCase().split(/\W+/)
  const positiveCount = words.filter(word => positiveWords.includes(word)).length
  const negativeCount = words.filter(word => negativeWords.includes(word)).length
  
  let sentiment: 'positive' | 'negative' | 'neutral'
  let confidence: number
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive'
    confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1)
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative'
    confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1)
  } else {
    sentiment = 'neutral'
    confidence = 0.5
  }
  
  // Extract keywords (simple approach)
  const keywords = words
    .filter(word => word.length > 3)
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 5)
  
  return { sentiment, confidence, keywords }
}

async function analyzeGoogleSentiment(content: string) {
  // Placeholder for Google Cloud Natural Language API
  // In production, implement actual API call
  console.log('Google sentiment analysis not implemented in demo')
  return analyzeLocalSentiment(content)
}

async function analyzeAwsSentiment(content: string) {
  // Placeholder for AWS Comprehend API
  // In production, implement actual API call
  console.log('AWS sentiment analysis not implemented in demo')
  return analyzeLocalSentiment(content)
}

async function analyzeAzureSentiment(content: string) {
  // Placeholder for Azure Text Analytics API
  // In production, implement actual API call
  console.log('Azure sentiment analysis not implemented in demo')
  return analyzeLocalSentiment(content)
}

async function updateConversationsWithSentiment(results: SentimentResult[], supabase: any) {
  const updates = results
    .filter(result => !result.error)
    .map(result => ({
      id: result.conversation_id,
      sentiment: result.sentiment,
      sentiment_score: result.confidence,
      sentiment_keywords: result.keywords || [],
      sentiment_emotions: result.emotions || {},
      sentiment_analyzed_at: new Date().toISOString()
    }))

  if (updates.length === 0) {
    console.log('No successful sentiment results to update')
    return
  }

  // Update conversations in batches
  const batchSize = 100
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from('conversations')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Failed to update sentiment batch ${i / batchSize + 1}:`, error.message)
    }
  }

  console.log(`Updated ${updates.length} conversations with sentiment data`)
}

async function logBatchMetrics(results: SentimentResult[], provider: string, supabase: any) {
  const metrics = {
    total_processed: results.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    provider,
    avg_confidence: results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => !r.error).length || 0,
    sentiment_distribution: {
      positive: results.filter(r => r.sentiment === 'positive').length,
      negative: results.filter(r => r.sentiment === 'negative').length,
      neutral: results.filter(r => r.sentiment === 'neutral').length
    },
    processed_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('processing_metrics')
    .insert({
      type: 'batch_sentiment',
      metrics,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to log batch metrics:', error.message)
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}