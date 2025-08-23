import { useState, useEffect } from 'react'
import { pipelineService, type QueueStats, type BatchProcessingResult } from '@/lib/services/pipeline'
import { Database } from '@/lib/types/database'

type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row']
type ScheduledTask = Database['public']['Tables']['scheduled_tasks']['Row']
type ProcessingMetrics = Database['public']['Tables']['processing_metrics']['Row']

export interface UsePipelineReturn {
  // Jobs
  jobs: ProcessingJob[]
  jobsLoading: boolean
  jobsError: string | null
  
  // Queue stats
  queueStats: QueueStats | null
  queueStatsLoading: boolean
  queueStatsError: string | null
  
  // Scheduled tasks
  scheduledTasks: ScheduledTask[]
  scheduledTasksLoading: boolean
  scheduledTasksError: string | null
  
  // Processing metrics
  metrics: ProcessingMetrics[]
  metricsLoading: boolean
  metricsError: string | null
  
  // Actions
  createJob: (job: Omit<ProcessingJob, 'id' | 'created_at' | 'updated_at'>) => Promise<ProcessingJob>
  updateJobStatus: (id: string, status: ProcessingJob['status'], result?: any, error?: string) => Promise<void>
  processBatch: (batchSize?: number) => Promise<BatchProcessingResult>
  triggerSentimentBatch: (conversationIds: string[], provider?: string) => Promise<void>
  triggerTrendAnalysis: (tenantId?: string, timeRange?: string) => Promise<void>
  triggerDataCleanup: (tenantId?: string) => Promise<void>
  
  // Refresh functions
  refreshJobs: () => Promise<void>
  refreshQueueStats: () => Promise<void>
  refreshScheduledTasks: () => Promise<void>
  refreshMetrics: () => Promise<void>
}

export function usePipeline(options?: {
  autoRefresh?: boolean
  refreshInterval?: number
  jobFilters?: {
    status?: ProcessingJob['status']
    type?: ProcessingJob['type']
    priority?: ProcessingJob['priority']
    limit?: number
  }
  metricsTimeRange?: string
}): UsePipelineReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    jobFilters = {},
    metricsTimeRange = '24h'
  } = options || {}

  // Jobs state
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)

  // Queue stats state
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [queueStatsLoading, setQueueStatsLoading] = useState(false)
  const [queueStatsError, setQueueStatsError] = useState<string | null>(null)

  // Scheduled tasks state
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [scheduledTasksLoading, setScheduledTasksLoading] = useState(false)
  const [scheduledTasksError, setScheduledTasksError] = useState<string | null>(null)

  // Metrics state
  const [metrics, setMetrics] = useState<ProcessingMetrics[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  // Fetch jobs
  const refreshJobs = async () => {
    setJobsLoading(true)
    setJobsError(null)
    try {
      const fetchedJobs = await pipelineService.getJobs(jobFilters)
      setJobs(fetchedJobs)
    } catch (error) {
      setJobsError(error instanceof Error ? error.message : 'Failed to fetch jobs')
    } finally {
      setJobsLoading(false)
    }
  }

  // Fetch queue stats
  const refreshQueueStats = async () => {
    setQueueStatsLoading(true)
    setQueueStatsError(null)
    try {
      const stats = await pipelineService.getQueueStats()
      setQueueStats(stats)
    } catch (error) {
      setQueueStatsError(error instanceof Error ? error.message : 'Failed to fetch queue stats')
    } finally {
      setQueueStatsLoading(false)
    }
  }

  // Fetch scheduled tasks
  const refreshScheduledTasks = async () => {
    setScheduledTasksLoading(true)
    setScheduledTasksError(null)
    try {
      const tasks = await pipelineService.getScheduledTasks()
      setScheduledTasks(tasks)
    } catch (error) {
      setScheduledTasksError(error instanceof Error ? error.message : 'Failed to fetch scheduled tasks')
    } finally {
      setScheduledTasksLoading(false)
    }
  }

  // Fetch metrics
  const refreshMetrics = async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const fetchedMetrics = await pipelineService.getProcessingMetrics(metricsTimeRange)
      setMetrics(fetchedMetrics)
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : 'Failed to fetch metrics')
    } finally {
      setMetricsLoading(false)
    }
  }

  // Action functions
  const createJob = async (job: Omit<ProcessingJob, 'id' | 'created_at' | 'updated_at'>) => {
    const newJob = await pipelineService.createJob(job)
    await refreshJobs() // Refresh jobs list
    return newJob
  }

  const updateJobStatus = async (id: string, status: ProcessingJob['status'], result?: any, error?: string) => {
    await pipelineService.updateJobStatus(id, status, result, error)
    await refreshJobs() // Refresh jobs list
  }

  const processBatch = async (batchSize?: number) => {
    const result = await pipelineService.processBatch(batchSize)
    await refreshJobs() // Refresh jobs list
    await refreshQueueStats() // Refresh stats
    return result
  }

  const triggerSentimentBatch = async (conversationIds: string[], provider?: string) => {
    await pipelineService.triggerSentimentBatch(conversationIds, provider)
    await refreshJobs() // Refresh jobs list
  }

  const triggerTrendAnalysis = async (tenantId?: string, timeRange?: string) => {
    await pipelineService.triggerTrendAnalysis(tenantId, timeRange)
    await refreshJobs() // Refresh jobs list
  }

  const triggerDataCleanup = async (tenantId?: string) => {
    await pipelineService.triggerDataCleanup(tenantId)
    await refreshJobs() // Refresh jobs list
  }

  // Initial data fetch
  useEffect(() => {
    refreshJobs()
    refreshQueueStats()
    refreshScheduledTasks()
    refreshMetrics()
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshJobs()
      refreshQueueStats()
      refreshMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  return {
    // State
    jobs,
    jobsLoading,
    jobsError,
    queueStats,
    queueStatsLoading,
    queueStatsError,
    scheduledTasks,
    scheduledTasksLoading,
    scheduledTasksError,
    metrics,
    metricsLoading,
    metricsError,
    
    // Actions
    createJob,
    updateJobStatus,
    processBatch,
    triggerSentimentBatch,
    triggerTrendAnalysis,
    triggerDataCleanup,
    
    // Refresh functions
    refreshJobs,
    refreshQueueStats,
    refreshScheduledTasks,
    refreshMetrics
  }
}

// Specialized hooks for specific use cases
export function usePipelineJobs(filters?: {
  status?: ProcessingJob['status']
  type?: ProcessingJob['type']
  priority?: ProcessingJob['priority']
  limit?: number
}) {
  return usePipeline({
    jobFilters: filters,
    autoRefresh: true,
    refreshInterval: 10000 // 10 seconds for jobs
  })
}

export function usePipelineStats() {
  const pipeline = usePipeline({
    autoRefresh: true,
    refreshInterval: 30000 // 30 seconds for stats
  })

  return {
    queueStats: pipeline.queueStats,
    queueStatsLoading: pipeline.queueStatsLoading,
    queueStatsError: pipeline.queueStatsError,
    metrics: pipeline.metrics,
    metricsLoading: pipeline.metricsLoading,
    metricsError: pipeline.metricsError,
    refreshStats: () => {
      pipeline.refreshQueueStats()
      pipeline.refreshMetrics()
    }
  }
}