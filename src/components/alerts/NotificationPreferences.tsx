'use client'

import React, { useState, useEffect } from 'react'
import { useNotificationPermission } from '@/lib/hooks/useAlerts'

interface NotificationPreferencesProps {
  preferences: any
  loading: boolean
  error: string | null
  onUpdate: (data: any) => Promise<any>
}

export function NotificationPreferences({ 
  preferences, 
  loading, 
  error, 
  onUpdate 
}: NotificationPreferencesProps) {
  const { permission, requestPermission, isSupported } = useNotificationPermission()
  
  const [formData, setFormData] = useState({
    email_enabled: true,
    email_frequency: 'immediate' as 'immediate' | 'hourly' | 'daily' | 'weekly',
    email_digest_time: '09:00',
    in_app_enabled: true,
    push_notifications: false,
    webhook_enabled: false,
    webhook_url: '',
    quiet_hours_start: '',
    quiet_hours_end: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled ?? true,
        email_frequency: preferences.email_frequency || 'immediate',
        email_digest_time: preferences.email_digest_time || '09:00',
        in_app_enabled: preferences.in_app_enabled ?? true,
        push_notifications: preferences.push_notifications ?? false,
        webhook_enabled: preferences.webhook_enabled ?? false,
        webhook_url: preferences.webhook_url || '',
        quiet_hours_start: preferences.quiet_hours_start || '',
        quiet_hours_end: preferences.quiet_hours_end || '',
        timezone: preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  }, [preferences])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    
    try {
      await onUpdate(formData)
      setSaveMessage('Preferences saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage('Failed to save preferences. Please try again.')
      setTimeout(() => setSaveMessage(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleRequestNotificationPermission = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      setFormData(prev => ({ ...prev, push_notifications: true }))
    }
  }

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'UTC'
  ]

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
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="email_enabled"
              checked={formData.email_enabled}
              onChange={(e) => handleInputChange('email_enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="email_enabled" className="ml-2 text-sm text-gray-700">
              Enable email notifications
            </label>
          </div>

          {formData.email_enabled && (
            <div className="ml-6 space-y-4">
              <div>
                <label htmlFor="email_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Frequency
                </label>
                <select
                  id="email_frequency"
                  value={formData.email_frequency}
                  onChange={(e) => handleInputChange('email_frequency', e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="hourly">Hourly Digest</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Digest</option>
                </select>
              </div>

              {(formData.email_frequency === 'daily' || formData.email_frequency === 'weekly') && (
                <div>
                  <label htmlFor="email_digest_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Digest Time
                  </label>
                  <input
                    type="time"
                    id="email_digest_time"
                    value={formData.email_digest_time}
                    onChange={(e) => handleInputChange('email_digest_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">In-App Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="in_app_enabled"
              checked={formData.in_app_enabled}
              onChange={(e) => handleInputChange('in_app_enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="in_app_enabled" className="ml-2 text-sm text-gray-700">
              Enable in-app notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="push_notifications"
              checked={formData.push_notifications}
              onChange={(e) => handleInputChange('push_notifications', e.target.checked)}
              disabled={!isSupported || permission !== 'granted'}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor="push_notifications" className="ml-2 text-sm text-gray-700">
              Enable browser push notifications
            </label>
          </div>

          {isSupported && permission !== 'granted' && (
            <div className="ml-6">
              <button
                onClick={handleRequestNotificationPermission}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Grant notification permission
              </button>
              <p className="text-xs text-gray-500 mt-1">
                You need to grant permission to receive browser notifications
              </p>
            </div>
          )}

          {!isSupported && (
            <p className="ml-6 text-xs text-gray-500">
              Browser notifications are not supported in your browser
            </p>
          )}
        </div>
      </div>

      {/* Webhook Notifications */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="webhook_enabled"
              checked={formData.webhook_enabled}
              onChange={(e) => handleInputChange('webhook_enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="webhook_enabled" className="ml-2 text-sm text-gray-700">
              Enable webhook notifications
            </label>
          </div>

          {formData.webhook_enabled && (
            <div className="ml-6">
              <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                placeholder="https://your-app.com/webhook/alerts"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send a POST request to this URL when alerts are triggered
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quiet Hours</h3>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Set quiet hours to pause notifications during specific times (applies to email and push notifications)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quiet_hours_start" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                id="quiet_hours_start"
                value={formData.quiet_hours_start}
                onChange={(e) => handleInputChange('quiet_hours_start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="quiet_hours_end" className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                id="quiet_hours_end"
                value={formData.quiet_hours_end}
                onChange={(e) => handleInputChange('quiet_hours_end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.quiet_hours_start && formData.quiet_hours_end && (
            <p className="text-xs text-gray-500">
              Notifications will be paused from {formData.quiet_hours_start} to {formData.quiet_hours_end} ({formData.timezone})
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        {saveMessage && (
          <div className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {saveMessage}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}