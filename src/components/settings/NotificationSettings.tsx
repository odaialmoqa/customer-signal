'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import { createClient } from '@/lib/supabase/client'

interface NotificationPreferences {
  email_alerts: boolean
  email_daily_digest: boolean
  email_weekly_report: boolean
  alert_threshold_high: boolean
  alert_threshold_medium: boolean
  alert_threshold_low: boolean
  platform_notifications: {
    reddit: boolean
    twitter: boolean
    linkedin: boolean
    facebook: boolean
    instagram: boolean
    youtube: boolean
    news: boolean
    reviews: boolean
    forums: boolean
  }
  quiet_hours: {
    enabled: boolean
    start_time: string
    end_time: string
    timezone: string
  }
}

const defaultPreferences: NotificationPreferences = {
  email_alerts: true,
  email_daily_digest: true,
  email_weekly_report: false,
  alert_threshold_high: true,
  alert_threshold_medium: true,
  alert_threshold_low: false,
  platform_notifications: {
    reddit: true,
    twitter: true,
    linkedin: true,
    facebook: true,
    instagram: true,
    youtube: true,
    news: true,
    reviews: true,
    forums: true
  },
  quiet_hours: {
    enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

export default function NotificationSettings() {
  const { profile, refreshData } = useTenant()
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (profile?.preferences?.notifications) {
      setPreferences({
        ...defaultPreferences,
        ...profile.preferences.notifications
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const updatedPreferences = {
        ...profile.preferences,
        notifications: preferences
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccess('Notification preferences updated successfully')
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setError(null)
    setSuccess(null)
  }

  const updatePlatformNotification = (platform: keyof NotificationPreferences['platform_notifications'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      platform_notifications: {
        ...prev.platform_notifications,
        [platform]: enabled
      }
    }))
    setError(null)
    setSuccess(null)
  }

  const updateQuietHours = (key: keyof NotificationPreferences['quiet_hours'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [key]: value
      }
    }))
    setError(null)
    setSuccess(null)
  }

  if (!profile) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading notification settings...</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Notifications */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email_alerts}
                onChange={(e) => updatePreference('email_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Instant email alerts for high-priority mentions
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email_daily_digest}
                onChange={(e) => updatePreference('email_daily_digest', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Daily digest of all mentions and conversations
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email_weekly_report}
                onChange={(e) => updatePreference('email_weekly_report', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Weekly summary report with insights and trends
              </span>
            </label>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Alert Priority Levels</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.alert_threshold_high}
                onChange={(e) => updatePreference('alert_threshold_high', e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                High priority alerts (negative sentiment, viral mentions)
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.alert_threshold_medium}
                onChange={(e) => updatePreference('alert_threshold_medium', e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Medium priority alerts (trending topics, competitor mentions)
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.alert_threshold_low}
                onChange={(e) => updatePreference('alert_threshold_low', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Low priority alerts (general mentions, positive feedback)
              </span>
            </label>
          </div>
        </div>

        {/* Platform Notifications */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Platform Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(preferences.platform_notifications).map(([platform, enabled]) => (
              <label key={platform} className="flex items-center">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => updatePlatformNotification(platform as keyof NotificationPreferences['platform_notifications'], e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700 capitalize">
                  {platform.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Quiet Hours</h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.quiet_hours.enabled}
                onChange={(e) => updateQuietHours('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Enable quiet hours (no notifications during specified times)
              </span>
            </label>
            
            {preferences.quiet_hours.enabled && (
              <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-xs font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="start_time"
                    type="time"
                    value={preferences.quiet_hours.start_time}
                    onChange={(e) => updateQuietHours('start_time', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="end_time" className="block text-xs font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="end_time"
                    type="time"
                    value={preferences.quiet_hours.end_time}
                    onChange={(e) => updateQuietHours('end_time', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="timezone" className="block text-xs font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={preferences.quiet_hours.timezone}
                    onChange={(e) => updateQuietHours('timezone', e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}