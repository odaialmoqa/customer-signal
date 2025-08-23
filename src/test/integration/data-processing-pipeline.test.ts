import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { pipelineService, pipelineHelpers } from '@/lib/services/pipeline'

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

describe('Data Processing Pipeline Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let testTenantId: string
  let testConversationIds: string[]

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Pipeline Tenant',
        settings: { data_retention_days: 30 }
      })
      .select()
      .single()

    if (tenantError) {
      throw new Error(`Failed to create test tenant: ${tenantError.message}`)
    }

    testTenantId = tenant.id

    // Create test conversations
    const conversations = [
      {
        content: 'This is a great product! I love it.',
        platform: 'twitter',
        author: 'user1',
        url: 'https://twitter.com/user1/status/1',
        tenant_id: testTenantId
      },
      {
        content: 'This product is terrible and disappointing.',
        platform: 'reddit',
        author: 'user2',
        url: 'https://reddit.com/r/test/comments/1',
        tenant_id: testTenantId
      },
      {
        content: 'The product is okay, nothing special.',
        platform: 'news',
        author: 'journalist',
        url: 'https://news.com/article/1',
        tenant_id: testTenantId
      }
    ]

    const { data: createdConversations, error: conversationError } = await supabase
      .from('conversations')
      .insert(conversations)
      .select('id')

    if (conversationError) {
      throw new Error(`Failed to create test conversations: ${conversationError.message}`)
    }

    testConversationIds = createdConversations.map(c => c.id)
  })

  afterAll(async () => {
    // Clean up test data
    if (testTenantId) {
      await supabase.from('processing_jobs').delete().eq('tenant_id', testTenantId)
      await supabase.from('conversations').delete().eq('tenant_id', testTenantId)
      await supabase.from('tenants').delete().eq('id', testTenantId)
    }
  })

  beforeEach(async () => {
    // Clean up processing jobs before each test
    await supabase.from('processing_jobs').delete().eq('tenant_id', testTenantId)
  })

  describe('Job Creation and Management', () => {
    it('should create and manage processing jobs', async () => {
      // Create a sentiment analysis job
      const job = await pipelineService.createJob({
        type: 'sentiment_analysis',
        data: { conversation_ids: [testConversationIds[0]] },
        priority: 'high',
        tenant_id: testTenantId
      })

      expect(job).toBeDefined()
      expect(job.type).toBe('sentiment_analysis')
      expect(job.status).toBe('pending')
      expect(job.priority).toBe('high')
      expect(job.tenant_id).toBe(testTenantId)

      // Fetch the job
      const fetchedJob = await pipelineService.getJobById(job.id)
      expect(fetchedJob).toEqual(job)

      // Update job status
      await pipelineService.updateJobStatus(job.id, 'processing')
      
      const updatedJob = await pipelineService.getJobById(job.id)
      expect(updatedJob?.status).toBe('processing')

      // Complete the job
      await pipelineService.updateJobStatus(job.id, 'completed', { sentiment: 'positive' })
      
      const completedJob = await pipelineService.getJobById(job.id)
      expect(completedJob?.status).toBe('completed')
      expect(completedJob?.result).toEqual({ sentiment: 'positive' })
    })

    it('should create batch jobs', async () => {
      const jobs = await pipelineService.createBatchJobs([
        {
          type: 'sentiment_analysis',
          data: { conversation_ids: [testConversationIds[0]] },
          priority: 'medium',
          tenant_id: testTenantId
        },
        {
          type: 'content_normalization',
          data: { conversation_ids: [testConversationIds[1]] },
          priority: 'low',
          tenant_id: testTenantId
        }
      ])

      expect(jobs).toHaveLength(2)
      expect(jobs[0].type).toBe('sentiment_analysis')
      expect(jobs[1].type).toBe('content_normalization')
    })

    it('should filter jobs correctly', async () => {
      // Create jobs with different statuses and types
      await pipelineService.createBatchJobs([
        {
          type: 'sentiment_analysis',
          data: { conversation_ids: [testConversationIds[0]] },
          priority: 'high',
          tenant_id: testTenantId
        },
        {
          type: 'content_normalization',
          data: { conversation_ids: [testConversationIds[1]] },
          priority: 'low',
          tenant_id: testTenantId
        }
      ])

      // Filter by type
      const sentimentJobs = await pipelineService.getJobs({
        type: 'sentiment_analysis',
        tenantId: testTenantId
      })
      expect(sentimentJobs).toHaveLength(1)
      expect(sentimentJobs[0].type).toBe('sentiment_analysis')

      // Filter by priority
      const highPriorityJobs = await pipelineService.getJobs({
        priority: 'high',
        tenantId: testTenantId
      })
      expect(highPriorityJobs).toHaveLength(1)
      expect(highPriorityJobs[0].priority).toBe('high')
    })
  })

  describe('Scheduled Tasks', () => {
    it('should create and manage scheduled tasks', async () => {
      const task = await pipelineService.createScheduledTask({
        name: 'Test Sentiment Batch',
        type: 'sentiment_batch',
        schedule: 'daily',
        enabled: true,
        config: { batch_size: 50 },
        tenant_id: testTenantId
      })

      expect(task).toBeDefined()
      expect(task.name).toBe('Test Sentiment Batch')
      expect(task.type).toBe('sentiment_batch')
      expect(task.enabled).toBe(true)

      // Update the task
      await pipelineService.updateScheduledTask(task.id, {
        enabled: false,
        config: { batch_size: 100 }
      })

      const tasks = await pipelineService.getScheduledTasks()
      const updatedTask = tasks.find(t => t.id === task.id)
      expect(updatedTask?.enabled).toBe(false)
      expect(updatedTask?.config).toEqual({ batch_size: 100 })
    })
  })

  describe('Queue Statistics', () => {
    it('should calculate queue statistics', async () => {
      // Create jobs with different statuses
      const jobs = await pipelineService.createBatchJobs([
        {
          type: 'sentiment_analysis',
          data: { conversation_ids: [testConversationIds[0]] },
          priority: 'high',
          tenant_id: testTenantId
        },
        {
          type: 'sentiment_analysis',
          data: { conversation_ids: [testConversationIds[1]] },
          priority: 'medium',
          tenant_id: testTenantId
        },
        {
          type: 'content_normalization',
          data: { conversation_ids: [testConversationIds[2]] },
          priority: 'low',
          tenant_id: testTenantId
        }
      ])

      // Update one job to completed
      await pipelineService.updateJobStatus(jobs[0].id, 'completed', null)

      // Update one job to failed
      await pipelineService.updateJobStatus(jobs[1].id, 'failed', null, 'Test error')

      const stats = await pipelineService.getQueueStats()

      expect(stats.pending).toBeGreaterThanOrEqual(1)
      expect(stats.completed).toBeGreaterThanOrEqual(1)
      expect(stats.failed).toBeGreaterThanOrEqual(1)
      expect(stats.by_type).toBeDefined()
    })
  })

  describe('Pipeline Helpers', () => {
    it('should create sentiment jobs using helpers', async () => {
      const jobs = await pipelineHelpers.createSentimentJobs(
        testConversationIds.slice(0, 2),
        testTenantId,
        'high'
      )

      expect(jobs).toHaveLength(2)
      jobs.forEach(job => {
        expect(job.type).toBe('sentiment_analysis')
        expect(job.priority).toBe('high')
        expect(job.tenant_id).toBe(testTenantId)
      })
    })

    it('should create normalization jobs using helpers', async () => {
      const jobs = await pipelineHelpers.createNormalizationJobs(
        [testConversationIds[0]],
        testTenantId
      )

      expect(jobs).toHaveLength(1)
      expect(jobs[0].type).toBe('content_normalization')
      expect(jobs[0].priority).toBe('low')
      expect(jobs[0].tenant_id).toBe(testTenantId)
    })

    it('should get conversation processing status', async () => {
      // Create jobs for conversations
      await pipelineHelpers.createSentimentJobs(
        [testConversationIds[0], testConversationIds[1]],
        testTenantId
      )

      const statusMap = await pipelineHelpers.getConversationProcessingStatus(testConversationIds)

      expect(statusMap.size).toBeGreaterThanOrEqual(2)
      expect(statusMap.get(testConversationIds[0])).toBe('pending')
      expect(statusMap.get(testConversationIds[1])).toBe('pending')
    })

    it('should calculate metrics correctly', () => {
      const jobs = [
        {
          id: 'job-1',
          status: 'pending' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'job-2',
          status: 'completed' as const,
          processing_time_ms: 150,
          created_at: '2024-01-01T11:00:00Z'
        },
        {
          id: 'job-3',
          status: 'failed' as const,
          processing_time_ms: null,
          created_at: '2024-01-01T12:00:00Z'
        }
      ] as any[]

      const metrics = pipelineHelpers.calculateMetrics(jobs)

      expect(metrics.total).toBe(3)
      expect(metrics.pending).toBe(1)
      expect(metrics.completed).toBe(1)
      expect(metrics.failed).toBe(1)
      expect(metrics.avgProcessingTime).toBe(150)
      expect(metrics.oldestPending).toEqual(new Date('2024-01-01T10:00:00Z'))
    })
  })

  describe('Database Triggers', () => {
    it('should automatically create processing jobs for new conversations', async () => {
      // Insert a new conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          content: 'New conversation for trigger test',
          platform: 'twitter',
          author: 'test_user',
          url: 'https://twitter.com/test/1',
          tenant_id: testTenantId
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(conversation).toBeDefined()

      // Wait a bit for triggers to execute
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if processing jobs were created
      const jobs = await pipelineService.getJobs({
        tenantId: testTenantId,
        limit: 10
      })

      const sentimentJob = jobs.find(job => 
        job.type === 'sentiment_analysis' && 
        job.data?.conversation_ids?.includes(conversation.id)
      )
      
      const normalizationJob = jobs.find(job => 
        job.type === 'content_normalization' && 
        job.data?.conversation_ids?.includes(conversation.id)
      )

      expect(sentimentJob).toBeDefined()
      expect(normalizationJob).toBeDefined()
    })
  })

  describe('Processing Metrics', () => {
    it('should store and retrieve processing metrics', async () => {
      // Insert test metrics
      const { error } = await supabase
        .from('processing_metrics')
        .insert({
          type: 'test_batch',
          metrics: {
            processed: 10,
            successful: 8,
            failed: 2,
            avg_processing_time: 125
          },
          tenant_id: testTenantId
        })

      expect(error).toBeNull()

      // Retrieve metrics
      const metrics = await pipelineService.getProcessingMetrics('24h')
      
      const testMetric = metrics.find(m => m.type === 'test_batch')
      expect(testMetric).toBeDefined()
      expect(testMetric?.metrics).toEqual({
        processed: 10,
        successful: 8,
        failed: 2,
        avg_processing_time: 125
      })
    })
  })
})