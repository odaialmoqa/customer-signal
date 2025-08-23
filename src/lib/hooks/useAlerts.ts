import { useState, useEffect, useCallback } from 'react'
import { alertService } from '@/lib/services/alert'
import type { Database } from '@/lib/types/database'

type Alert = Database['public']['Tables']['alerts']['Row']
type AlertConfiguration = Database['public']['Tables']['alert_configurations']['Row']
type AlertNotificationPreferences = Database['public']['Tables']['alert_notification_preferences']['Row']

export interface UseAlertsOptions {
  limit?: number
  unreadOnly?: boolean
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  autoRefresh?: boolean
  realtime?: boolean
}

export interface UseAlertsReturn {
  alerts: Alert[]
  loading: boolean
  error: string | null
  totalCount: number
  unreadCount: number
  refresh: () => Promise<void>
  markAsRead: (alertId: string) => Promise<void>
  markAllAsRead: (alertIds: string[]) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    limit = 20,
    unreadOnly = false,
    priority,
    autoRefresh = false,
    realtime = true
  } = options

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchAlerts = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
      const { alerts: newAlerts, count } = await alertService.getAlerts({
        limit,
        offset: currentOffset,
        unreadOnly,
        priority
      })

      if (reset) {
        setAlerts(newAlerts)
        setOffset(limit)
      } else {
        setAlerts(prev => [...prev, ...newAlerts])
        setOffset(prev => prev + limit)
      }

      setTotalCount(count)
      setHasMore(newAlerts.length === limit && currentOffset + limit < count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, unreadOnly, priority])

  const refresh = useCallback(async () => {
    setOffset(0)
    await fetchAlerts(true)
  }, [fetchAlerts])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchAlerts(false)
  }, [fetchAlerts, hasMore, loading])

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await alertService.markAlertAsRead(alertId)
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark alert as read')
    }
  }, [])

  const markAllAsRead = useCallback(async (alertIds: string[]) => {
    try {
      await alertService.markAlertsAsRead(alertIds)
      setAlerts(prev => 
        prev.map(alert => 
          alertIds.includes(alert.id) ? { ...alert, is_read: true } : alert
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark alerts as read')
    }
  }, [])

  // Calculate unread count
  const unreadCount = alerts.filter(alert => !alert.is_read).length

  // Initial fetch
  useEffect(() => {
    fetchAlerts(true)
  }, [unreadOnly, priority]) // Re-fetch when filters change

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refresh()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, refresh])

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return

    const unsubscribe = alertService.subscribeToAlerts((newAlert) => {
      // Add new alert to the beginning of the list
      setAlerts(prev => [newAlert, ...prev])
      setTotalCount(prev => prev + 1)
      
      // Show browser notification if supported and enabled
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newAlert.title, {
          body: newAlert.message,
          icon: '/favicon.ico',
          tag: newAlert.id
        })
      }
    })

    return unsubscribe
  }, [realtime])

  return {
    alerts,
    loading,
    error,
    totalCount,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
    loadMore,
    hasMore
  }
}

export interface UseAlertConfigurationsReturn {
  configurations: AlertConfiguration[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (data: any) => Promise<AlertConfiguration>
  update: (id: string, data: any) => Promise<AlertConfiguration>
  delete: (id: string) => Promise<void>
  test: (id: string) => Promise<{ success: boolean, message: string }>
}

export function useAlertConfigurations(): UseAlertConfigurationsReturn {
  const [configurations, setConfigurations] = useState<AlertConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await alertService.getAlertConfigurations()
      setConfigurations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert configurations')
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: any) => {
    try {
      const newConfig = await alertService.createAlertConfiguration(data)
      setConfigurations(prev => [newConfig, ...prev])
      return newConfig
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create alert configuration'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const update = useCallback(async (id: string, data: any) => {
    try {
      const updatedConfig = await alertService.updateAlertConfiguration(id, data)
      setConfigurations(prev => 
        prev.map(config => config.id === id ? updatedConfig : config)
      )
      return updatedConfig
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update alert configuration'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const deleteConfig = useCallback(async (id: string) => {
    try {
      await alertService.deleteAlertConfiguration(id)
      setConfigurations(prev => prev.filter(config => config.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete alert configuration'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const test = useCallback(async (id: string) => {
    try {
      return await alertService.testAlertConfiguration(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test alert configuration'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchConfigurations()
  }, [fetchConfigurations])

  // Initial fetch
  useEffect(() => {
    fetchConfigurations()
  }, [fetchConfigurations])

  // Real-time subscription for configurations
  useEffect(() => {
    const unsubscribe = alertService.subscribeToAlertConfigurations((config) => {
      setConfigurations(prev => {
        const existing = prev.find(c => c.id === config.id)
        if (existing) {
          return prev.map(c => c.id === config.id ? config : c)
        } else {
          return [config, ...prev]
        }
      })
    })

    return unsubscribe
  }, [])

  return {
    configurations,
    loading,
    error,
    refresh,
    create,
    update,
    delete: deleteConfig,
    test
  }
}

export interface UseNotificationPreferencesReturn {
  preferences: AlertNotificationPreferences | null
  loading: boolean
  error: string | null
  update: (data: any) => Promise<AlertNotificationPreferences>
  refresh: () => Promise<void>
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<AlertNotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await alertService.getNotificationPreferences()
      setPreferences(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notification preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (data: any) => {
    try {
      const updatedPreferences = await alertService.updateNotificationPreferences(data)
      setPreferences(updatedPreferences)
      return updatedPreferences
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification preferences'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchPreferences()
  }, [fetchPreferences])

  // Initial fetch
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    loading,
    error,
    update,
    refresh
  }
}

// Hook for requesting notification permissions
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    }
    return 'denied'
  }, [])

  return {
    permission,
    requestPermission,
    isSupported: 'Notification' in window
  }
}