import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row']
type ProcessingJobInsert = Database['public']['Tables']['processing_jobs']['Insert']
type ScheduledTask = Database['public']['Tables']['scheduled_tasks']['Row']
type ProcessingMetrics = Database['public']['Tables']['processing_metrics']['Row']

export interface PipelineService {
  // Job management
  createJob(job: Omit<ProcessingJobInsert, 'id' | 'created_at' | 'updated_at'>): Promise<ProcessingJob>
  getJobs(filters?: JobFilters): Promise<ProcessingJob[]>
  getJobById(id: string): Promise<ProcessingJob | null>
  updateJobStatus(id: string, status: ProcessingJob['status'], result?: any, error?: string): Promise<void>
  deleteJob(id: string): Promise<void>
  
  // Batch operations
  createBatchJobs(jobs: Omit<ProcessingJobInsert, 'id' | 'created_at' | 'updated_at'>[]): Promise<ProcessingJob[]>
  processBatch(batchSize?: number): Promise<BatchProcessingResult>
  
  // Scheduled tasks
  getScheduledTasks(): Promise<ScheduledTask[]>
  createScheduledTask(task: Omit<ScheduledTask, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledTask>
  updateScheduledTask(id: string, updates: Partial<ScheduledTask>): Promise<void>
  
  // Metrics and monitoring
  getProcessingMetrics(timeRange?: string): Promise<ProcessingMetrics[]>
  getQueueStats(): Promise<QueueStats>
  
  // Pipeline operations
  triggerSentimentBatch(conversationIds: string[], provider?: string): Promise<void>
  triggerTrendAnalysis(tenantId?: string, timeRange?: string): Promise<void>
  triggerDataCleanup(tenantId?: string): Promise<void>
}

export interface JobFilters {
  status?: ProcessingJob['status']
  type?: ProcessingJob['type']
  tenantId?: string
  priority?: ProcessingJob['priority']
  limit?: number
  offset?: number
}

export interface BatchProcessingResult {
  processed: number
  successful: number
  failed: number
  results: Array<{
    job_id: string
    result?: any
    error?: string
    processing_time_ms: number
  }>
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
  avg_processing_time_ms: number
}

class PipelineServiceImpl implements PipelineService {
  private supabase = createClient()

  async createJob(job: Omit<ProcessingJobInsert, 'id' | 'created_at' | 'updated_at'>): Promise<ProcessingJob> {
    const { data, error } = await this.supabase
      .from('processing_jobs')
      .insert(job)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create processing job: ${error.message}`)
    }

    return data
  }

  async getJobs(filters: JobFilters = {}): Promise<ProcessingJob[]> {
    let query = this.supabase
      .from('processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch processing jobs: ${error.message}`)
    }

    return data || []
  }

  async getJobById(id: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch processing job: ${error.message}`)
    }

    return data
  }

  async updateJobStatus(
    id: string, 
    status: ProcessingJob['status'], 
    result?: any, 
    error?: string
  ): Promise<void> {
    const updates: Partial<ProcessingJob> = { status }

    if (result !== undefined) {
      updates.result = result
    }

    if (error !== undefined) {
      updates.error = error
    }

    const { error: updateError } = await this.supabase
      .from('processing_jobs')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update processing job: ${updateError.message}`)
    }
  }

  async deleteJob(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('processing_jobs')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete processing job: ${error.message}`)
    }
  }

  async createBatchJobs(jobs: Omit<ProcessingJobInsert, 'id' | 'created_at' | 'updated_at'>[]): Promise<ProcessingJob[]> {
    const { data, error } = await this.supabase
      .from('processing_jobs')
      .insert(jobs)
      .select()

    if (error) {
      throw new Error(`Failed to create batch jobs: ${error.message}`)
    }

    return data || []
  }

  async processBatch(batchSize = 10): Promise<BatchProcessingResult> {
    const { data, error } = await this.supabase.functions.invoke('process-pipeline', {
      body: { batch_size: batchSize }
    })

    if (error) {
      throw new Error(`Failed to process batch: ${error.message}`)
    }

    return {
      processed: data.processed || 0,
      successful: data.results?.filter((r: any) => !r.error).length || 0,
      failed: data.results?.filter((r: any) => r.error).length || 0,
      results: data.results || []
    }
  }

  async getScheduledTasks(): Promise<ScheduledTask[]> {
    const { data, error } = await this.supabase
      .from('scheduled_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch scheduled tasks: ${error.message}`)
    }

    return data || []
  }

  async createScheduledTask(task: Omit<ScheduledTask, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledTask> {
    const { data, error } = await this.supabase
      .from('scheduled_tasks')
      .insert(task)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create scheduled task: ${error.message}`)
    }

    return data
  }

  async updateScheduledTask(id: string, updates: Partial<ScheduledTask>): Promise<void> {
    const { error } = await this.supabase
      .from('scheduled_tasks')
      .update(updates)
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update scheduled task: ${error.message}`)
    }
  }

  async getProcessingMetrics(timeRange = '24h'): Promise<ProcessingMetrics[]> {
    let timeFilter: string
    
    switch (timeRange) {
      case '1h':
        timeFilter = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        break
      case '24h':
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        break
      case '7d':
        timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        break
      default:
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }

    const { data, error } = await this.supabase
      .from('processing_metrics')
      .select('*')
      .gte('created_at', timeFilter)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch processing metrics: ${error.message}`)
    }

    return data || []
  }

  async getQueueStats(): Promise<QueueStats> {
    const { data, error } = await this.supabase.rpc('get_processing_queue_stats')

    if (error) {
      throw new Error(`Failed to fetch queue stats: ${error.message}`)
    }

    // Transform the data into the expected format
    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      by_type: {},
      by_priority: {},
      avg_processing_time_ms: 0
    }

    let totalProcessingTime = 0
    let processedCount = 0

    for (const row of data || []) {
      // Count by status
      stats[row.status as keyof QueueStats] = (stats[row.status as keyof QueueStats] as number) + Number(row.count)
      
      // Count by type
      stats.by_type[row.type] = (stats.by_type[row.type] || 0) + Number(row.count)
      
      // Calculate average processing time
      if (row.avg_processing_time_ms) {
        totalProcessingTime += Number(row.avg_processing_time_ms) * Number(row.count)
        processedCount += Number(row.count)
      }
    }

    stats.avg_processing_time_ms = processedCount > 0 ? totalProcessingTime / processedCount : 0

    return stats
  }

  async triggerSentimentBatch(conversationIds: string[], provider = 'local'): Promise<void> {
    const { error } = await this.supabase.functions.invoke('batch-sentiment', {
      body: {
        conversation_ids: conversationIds,
        provider,
        batch_size: 50
      }
    })

    if (error) {
      throw new Error(`Failed to trigger sentiment batch: ${error.message}`)
    }
  }

  async triggerTrendAnalysis(tenantId?: string, timeRange = '24h'): Promise<void> {
    const { error } = await this.supabase.functions.invoke('scheduled-pipeline', {
      body: {
        task_type: 'trend_analysis',
        tenant_id: tenantId,
        time_range: timeRange
      }
    })

    if (error) {
      throw new Error(`Failed to trigger trend analysis: ${error.message}`)
    }
  }

  async triggerDataCleanup(tenantId?: string): Promise<void> {
    const { error } = await this.supabase.functions.invoke('scheduled-pipeline', {
      body: {
        task_type: 'data_cleanup',
        tenant_id: tenantId
      }
    })

    if (error) {
      throw new Error(`Failed to trigger data cleanup: ${error.message}`)
    }
  }
}

// Export singleton instance
export const pipelineService = new PipelineServiceImpl()

// Helper functions for common pipeline operations
export const pipelineHelpers = {
  // Create sentiment analysis jobs for conversations
  async createSentimentJobs(conversationIds: string[], tenantId?: string, priority: ProcessingJob['priority'] = 'medium') {
    const jobs = conversationIds.map(id => ({
      type: 'sentiment_analysis' as const,
      data: { conversation_ids: [id] },
      priority,
      tenant_id: tenantId || null
    }))

    return pipelineService.createBatchJobs(jobs)
  },

  // Create content normalization jobs
  async createNormalizationJobs(conversationIds: string[], tenantId?: string) {
    const jobs = conversationIds.map(id => ({
      type: 'content_normalization' as const,
      data: { conversation_ids: [id] },
      priority: 'low' as const,
      tenant_id: tenantId || null
    }))

    return pipelineService.createBatchJobs(jobs)
  },

  // Get processing status for conversations
  async getConversationProcessingStatus(conversationIds: string[]) {
    const jobs = await pipelineService.getJobs({
      limit: 1000 // Adjust as needed
    })

    const statusMap = new Map<string, ProcessingJob['status']>()

    for (const job of jobs) {
      const jobConversationIds = job.data?.conversation_ids || []
      for (const convId of jobConversationIds) {
        if (conversationIds.includes(convId)) {
          statusMap.set(convId, job.status)
        }
      }
    }

    return statusMap
  },

  // Calculate processing metrics
  calculateMetrics(jobs: ProcessingJob[]) {
    const now = Date.now()
    const metrics = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      avgProcessingTime: 0,
      oldestPending: null as Date | null
    }

    let totalProcessingTime = 0
    let completedCount = 0

    for (const job of jobs) {
      metrics[job.status]++

      if (job.processing_time_ms && job.status === 'completed') {
        totalProcessingTime += job.processing_time_ms
        completedCount++
      }

      if (job.status === 'pending' && (!metrics.oldestPending || new Date(job.created_at) < metrics.oldestPending)) {
        metrics.oldestPending = new Date(job.created_at)
      }
    }

    metrics.avgProcessingTime = completedCount > 0 ? totalProcessingTime / completedCount : 0

    return metrics
  }
}