import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AlertService } from '@/lib/services/alert'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

describe('AlertService', () => {
  let alertService: AlertService
  let mockSupabase: any

  beforeEach(() => {
    // Create a chainable mock that returns itself for most methods
    const createChainableMock = () => {
      const mock = {
        from: vi.fn(),
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        in: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
        single: vi.fn(),
        upsert: vi.fn(),
        gte: vi.fn(),
        lte: vi.fn(),
        channel: vi.fn(),
        on: vi.fn(),
        subscribe: vi.fn(),
        removeChannel: vi.fn(),
        functions: {
          invoke: vi.fn()
        }
      }
      
      // Make most methods return the mock itself for chaining
      Object.keys(mock).forEach(key => {
        if (key !== 'removeChannel' && key !== 'functions') {
          mock[key].mockReturnValue(mock)
        }
      })
      
      return mock
    }

    mockSupabase = createChainableMock()
    vi.mocked(createClient).mockReturnValue(mockSupabase)
    alertService = new AlertService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAlertConfigurations', () => {
    it('should fetch alert configurations successfully', async () => {
      const mockConfigurations = [
        {
          id: '1',
          name: 'Test Alert',
          alert_type: 'keyword_mention',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockConfigurations,
        error: null
      })

      const result = await alertService.getAlertConfigurations()

      expect(mockSupabase.from).toHaveBeenCalledWith('alert_configurations')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockConfigurations)
    })

    it('should handle errors when fetching configurations', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(alertService.getAlertConfigurations()).rejects.toThrow(
        'Failed to fetch alert configurations: Database error'
      )
    })
  })

  describe('createAlertConfiguration', () => {
    it('should create a new alert configuration', async () => {
      const configData = {
        name: 'Test Alert',
        description: 'Test description',
        alert_type: 'keyword_mention' as const,
        keyword_ids: ['keyword-1'],
        platforms: ['twitter'],
        notification_channels: ['email' as const],
        priority: 'medium' as const
      }

      const mockCreatedConfig = {
        id: 'config-1',
        ...configData,
        created_at: new Date().toISOString()
      }

      mockSupabase.single.mockResolvedValue({
        data: mockCreatedConfig,
        error: null
      })

      const result = await alertService.createAlertConfiguration(configData)

      expect(mockSupabase.from).toHaveBeenCalledWith('alert_configurations')
      expect(mockSupabase.insert).toHaveBeenCalledWith([configData])
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(result).toEqual(mockCreatedConfig)
    })

    it('should handle creation errors', async () => {
      const configData = {
        name: 'Test Alert',
        alert_type: 'keyword_mention' as const
      }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Validation error' }
      })

      await expect(alertService.createAlertConfiguration(configData)).rejects.toThrow(
        'Failed to create alert configuration: Validation error'
      )
    })
  })

  describe('getAlerts', () => {
    it('should fetch alerts with default options', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Test Alert',
          priority: 'medium',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockAlerts,
        error: null,
        count: 1
      })

      const result = await alertService.getAlerts()

      expect(mockSupabase.from).toHaveBeenCalledWith('alerts')
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('conversation:conversations(*)')
      )
      expect(result).toEqual({ alerts: mockAlerts, count: 1 })
    })

    it('should filter unread alerts when unreadOnly is true', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Unread Alert',
          is_read: false
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockAlerts,
        error: null,
        count: 1
      })

      await alertService.getAlerts({ unreadOnly: true })

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('should filter by priority when specified', async () => {
      await alertService.getAlerts({ priority: 'high' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('priority', 'high')
    })

    it('should apply limit and offset for pagination', async () => {
      await alertService.getAlerts({ limit: 10, offset: 20 })

      expect(mockSupabase.limit).toHaveBeenCalledWith(10)
      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29)
    })
  })

  describe('markAlertAsRead', () => {
    it('should mark a single alert as read', async () => {
      mockSupabase.update.mockResolvedValue({
        error: null
      })

      await alertService.markAlertAsRead('alert-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('alerts')
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_read: true })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'alert-1')
    })

    it('should handle errors when marking alert as read', async () => {
      mockSupabase.update.mockResolvedValue({
        error: { message: 'Update failed' }
      })

      await expect(alertService.markAlertAsRead('alert-1')).rejects.toThrow(
        'Failed to mark alert as read: Update failed'
      )
    })
  })

  describe('markAlertsAsRead', () => {
    it('should mark multiple alerts as read', async () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3']
      
      mockSupabase.update.mockResolvedValue({
        error: null
      })

      await alertService.markAlertsAsRead(alertIds)

      expect(mockSupabase.from).toHaveBeenCalledWith('alerts')
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_read: true })
      expect(mockSupabase.in).toHaveBeenCalledWith('id', alertIds)
    })
  })

  describe('subscribeToAlerts', () => {
    it('should set up real-time subscription for alerts', () => {
      const mockCallback = vi.fn()
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      mockSupabase.channel.mockReturnValue(mockChannel)

      const unsubscribe = alertService.subscribeToAlerts(mockCallback)

      expect(mockSupabase.channel).toHaveBeenCalledWith('alerts')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()

      // Test unsubscribe
      unsubscribe()
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })

    it('should call callback when new alert is received', () => {
      const mockCallback = vi.fn()
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      }

      let onChangeCallback: Function

      mockChannel.on.mockImplementation((event, config, callback) => {
        onChangeCallback = callback
        return mockChannel
      })

      mockSupabase.channel.mockReturnValue(mockChannel)

      alertService.subscribeToAlerts(mockCallback)

      // Simulate new alert
      const newAlert = {
        id: 'new-alert',
        title: 'New Alert',
        priority: 'high'
      }

      onChangeCallback({ new: newAlert })

      expect(mockCallback).toHaveBeenCalledWith(newAlert)
    })
  })

  describe('testAlertConfiguration', () => {
    it('should create a test alert successfully', async () => {
      const configId = 'config-1'
      const mockConfig = {
        data: {
          id: configId,
          name: 'Test Config',
          tenant_id: 'tenant-1',
          priority: 'medium'
        },
        error: null
      }

      mockSupabase.single.mockResolvedValueOnce(mockConfig)
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await alertService.testAlertConfiguration(configId)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Test alert created successfully')
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          tenant_id: 'tenant-1',
          alert_configuration_id: configId,
          priority: 'medium',
          title: 'Test Alert: Test Config',
          metadata: expect.objectContaining({
            test: true
          })
        })
      ])
    })

    it('should handle configuration not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Configuration not found' }
      })

      const result = await alertService.testAlertConfiguration('invalid-id')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Configuration not found')
    })
  })

  describe('getAlertStats', () => {
    it('should calculate alert statistics correctly', async () => {
      const mockAlerts = [
        {
          priority: 'high',
          created_at: new Date().toISOString(),
          is_read: false,
          alert_configuration_id: 'config-1'
        },
        {
          priority: 'medium',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
          alert_configuration_id: 'config-2'
        },
        {
          priority: 'high',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_read: false,
          alert_configuration_id: 'config-1'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockAlerts,
        error: null
      })

      const stats = await alertService.getAlertStats()

      expect(stats.total).toBe(3)
      expect(stats.unread).toBe(2)
      expect(stats.byPriority).toEqual({
        high: 2,
        medium: 1
      })
      expect(stats.recentTrend).toHaveLength(7)
      expect(stats.recentTrend[6].count).toBeGreaterThan(0) // Today should have alerts
    })

    it('should handle time range filtering', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      })

      await alertService.getAlertStats(timeRange)

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', timeRange.start.toISOString())
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', timeRange.end.toISOString())
    })
  })
})