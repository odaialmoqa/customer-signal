'use client'

import React, { useState } from 'react'
import { useAlerts, useAlertConfigurations, useNotificationPreferences } from '@/lib/hooks/useAlerts'
import { AlertList } from './AlertList'
import { AlertConfigurationForm } from './AlertConfigurationForm'
import { NotificationPreferences } from './NotificationPreferences'

interface AlertManagementProps {
  className?: string
}

export function AlertManagement({ className = '' }: AlertManagementProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'configurations' | 'preferences'>('alerts')
  const [showConfigForm, setShowConfigForm] = useState(false)

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: refreshAlerts
  } = useAlerts({ realtime: true })

  const {
    configurations,
    loading: configsLoading,
    error: configsError,
    create: createConfig,
    update: updateConfig,
    delete: deleteConfig,
    test: testConfig,
    refresh: refreshConfigs
  } = useAlertConfigurations()

  const {
    preferences,
    loading: preferencesLoading,
    error: preferencesError,
    update: updatePreferences
  } = useNotificationPreferences()

  const tabs = [
    { id: 'alerts', label: 'Alerts', count: unreadCount },
    { id: 'configurations', label: 'Alert Rules', count: configurations.length },
    { id: 'preferences', label: 'Preferences', count: null }
  ]

  const handleMarkAllAsRead = async () => {
    const unreadAlerts = alerts.filter(alert => !alert.is_read)
    if (unreadAlerts.length > 0) {
      await markAllAsRead(unreadAlerts.map(alert => alert.id))
    }
  }

  const handleCreateConfig = async (configData: any) => {
    try {
      await createConfig(configData)
      setShowConfigForm(false)
    } catch (error) {
      console.error('Failed to create alert configuration:', error)
    }
  }

  const handleUpdateConfig = async (id: string, configData: any) => {
    try {
      await updateConfig(id, configData)
    } catch (error) {
      console.error('Failed to update alert configuration:', error)
    }
  }

  const handleDeleteConfig = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this alert configuration?')) {
      try {
        await deleteConfig(id)
      } catch (error) {
        console.error('Failed to delete alert configuration:', error)
      }
    }
  }

  const handleTestConfig = async (id: string) => {
    try {
      const result = await testConfig(id)
      if (result.success) {
        alert('Test alert created successfully! Check your alerts tab.')
      } else {
        alert(`Test failed: ${result.message}`)
      }
    } catch (error) {
      alert('Failed to test alert configuration')
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Alert Management</h2>
          <div className="flex items-center space-x-3">
            {activeTab === 'alerts' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
            {activeTab === 'configurations' && (
              <button
                onClick={() => setShowConfigForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                New Alert Rule
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'alerts' && (
          <AlertList
            alerts={alerts}
            loading={alertsLoading}
            error={alertsError}
            onMarkAsRead={markAsRead}
            onRefresh={refreshAlerts}
          />
        )}

        {activeTab === 'configurations' && (
          <div>
            {showConfigForm ? (
              <AlertConfigurationForm
                onSubmit={handleCreateConfig}
                onCancel={() => setShowConfigForm(false)}
                loading={configsLoading}
              />
            ) : (
              <AlertConfigurationList
                configurations={configurations}
                loading={configsLoading}
                error={configsError}
                onUpdate={handleUpdateConfig}
                onDelete={handleDeleteConfig}
                onTest={handleTestConfig}
                onRefresh={refreshConfigs}
              />
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <NotificationPreferences
            preferences={preferences}
            loading={preferencesLoading}
            error={preferencesError}
            onUpdate={updatePreferences}
          />
        )}
      </div>
    </div>
  )
}

interface AlertConfigurationListProps {
  configurations: any[]
  loading: boolean
  error: string | null
  onUpdate: (id: string, data: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTest: (id: string) => Promise<void>
  onRefresh: () => Promise<void>
}

function AlertConfigurationList({
  configurations,
  loading,
  error,
  onUpdate,
  onDelete,
  onTest,
  onRefresh
}: AlertConfigurationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  if (configurations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No alert configurations yet</div>
        <p className="text-sm text-gray-400">
          Create your first alert rule to start receiving notifications
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {configurations.map((config) => (
        <div
          key={config.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
        >
          {editingId === config.id ? (
            <AlertConfigurationForm
              initialData={config}
              onSubmit={async (data) => {
                await onUpdate(config.id, data)
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
              loading={false}
            />
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">{config.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      config.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      config.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : config.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : config.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {config.priority}
                    </span>
                  </div>
                  {config.description && (
                    <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Type: {config.alert_type.replace('_', ' ')}</span>
                    {config.platforms && config.platforms.length > 0 && (
                      <span>Platforms: {config.platforms.join(', ')}</span>
                    )}
                    {config.notification_channels && (
                      <span>Channels: {config.notification_channels.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onTest(config.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => setEditingId(config.id)}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(config.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}