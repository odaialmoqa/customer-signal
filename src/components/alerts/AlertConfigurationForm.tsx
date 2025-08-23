'use client'

import React, { useState, useEffect } from 'react'
import { useKeywords } from '@/lib/hooks/useKeywords'

interface AlertConfigurationFormProps {
  initialData?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function AlertConfigurationForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading 
}: AlertConfigurationFormProps) {
  const { keywords } = useKeywords()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    alert_type: 'keyword_mention' as 'keyword_mention' | 'sentiment_threshold' | 'volume_spike' | 'custom',
    keyword_ids: [] as string[],
    sentiment_threshold: 0.7,
    volume_threshold: 10,
    platforms: [] as string[],
    notification_channels: ['in_app'] as ('email' | 'in_app' | 'webhook' | 'sms')[],
    frequency: 'immediate' as 'immediate' | 'hourly' | 'daily' | 'weekly',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    is_active: true,
    conditions: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        alert_type: initialData.alert_type || 'keyword_mention',
        keyword_ids: initialData.keyword_ids || [],
        sentiment_threshold: initialData.sentiment_threshold || 0.7,
        volume_threshold: initialData.volume_threshold || 10,
        platforms: initialData.platforms || [],
        notification_channels: initialData.notification_channels || ['in_app'],
        frequency: initialData.frequency || 'immediate',
        priority: initialData.priority || 'medium',
        is_active: initialData.is_active !== false,
        conditions: initialData.conditions || {}
      })
    }
  }, [initialData])

  const platformOptions = [
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'reddit', label: 'Reddit' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'yelp', label: 'Yelp' },
    { value: 'google_reviews', label: 'Google Reviews' },
    { value: 'trustpilot', label: 'Trustpilot' },
    { value: 'g2', label: 'G2' },
    { value: 'capterra', label: 'Capterra' },
    { value: 'news', label: 'News Sites' },
    { value: 'blog', label: 'Blogs' },
    { value: 'forum', label: 'Forums' }
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (formData.alert_type === 'keyword_mention' && formData.keyword_ids.length === 0) {
      newErrors.keyword_ids = 'At least one keyword is required for keyword mention alerts'
    }

    if (formData.alert_type === 'sentiment_threshold' && 
        (formData.sentiment_threshold < 0 || formData.sentiment_threshold > 1)) {
      newErrors.sentiment_threshold = 'Sentiment threshold must be between 0 and 1'
    }

    if (formData.alert_type === 'volume_spike' && formData.volume_threshold < 1) {
      newErrors.volume_threshold = 'Volume threshold must be at least 1'
    }

    if (formData.notification_channels.length === 0) {
      newErrors.notification_channels = 'At least one notification channel is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field as keyof typeof prev] as string[], value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Alert Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Negative Sentiment Alert"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="alert_type" className="block text-sm font-medium text-gray-700 mb-2">
            Alert Type *
          </label>
          <select
            id="alert_type"
            value={formData.alert_type}
            onChange={(e) => handleInputChange('alert_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="keyword_mention">Keyword Mention</option>
            <option value="sentiment_threshold">Sentiment Threshold</option>
            <option value="volume_spike">Volume Spike</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe when this alert should trigger..."
        />
      </div>

      {/* Alert Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Alert Configuration</h3>

        {/* Keywords */}
        {(formData.alert_type === 'keyword_mention' || formData.alert_type === 'custom') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords {formData.alert_type === 'keyword_mention' ? '*' : ''}
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {keywords.map((keyword) => (
                <label key={keyword.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.keyword_ids.includes(keyword.id)}
                    onChange={(e) => handleArrayChange('keyword_ids', keyword.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{keyword.term}</span>
                </label>
              ))}
            </div>
            {errors.keyword_ids && <p className="mt-1 text-sm text-red-600">{errors.keyword_ids}</p>}
          </div>
        )}

        {/* Sentiment Threshold */}
        {(formData.alert_type === 'sentiment_threshold' || formData.alert_type === 'custom') && (
          <div>
            <label htmlFor="sentiment_threshold" className="block text-sm font-medium text-gray-700 mb-2">
              Sentiment Threshold {formData.alert_type === 'sentiment_threshold' ? '*' : ''}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                id="sentiment_threshold"
                min="0"
                max="1"
                step="0.1"
                value={formData.sentiment_threshold}
                onChange={(e) => handleInputChange('sentiment_threshold', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12">
                {(formData.sentiment_threshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Alert when negative sentiment confidence is above this threshold
            </p>
            {errors.sentiment_threshold && <p className="mt-1 text-sm text-red-600">{errors.sentiment_threshold}</p>}
          </div>
        )}

        {/* Volume Threshold */}
        {(formData.alert_type === 'volume_spike' || formData.alert_type === 'custom') && (
          <div>
            <label htmlFor="volume_threshold" className="block text-sm font-medium text-gray-700 mb-2">
              Volume Threshold {formData.alert_type === 'volume_spike' ? '*' : ''}
            </label>
            <input
              type="number"
              id="volume_threshold"
              min="1"
              value={formData.volume_threshold}
              onChange={(e) => handleInputChange('volume_threshold', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.volume_threshold ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="10"
            />
            <p className="mt-1 text-xs text-gray-500">
              Alert when mentions per hour exceed this number
            </p>
            {errors.volume_threshold && <p className="mt-1 text-sm text-red-600">{errors.volume_threshold}</p>}
          </div>
        )}

        {/* Platforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms (leave empty for all platforms)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
            {platformOptions.map((platform) => (
              <label key={platform.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.platforms.includes(platform.value)}
                  onChange={(e) => handleArrayChange('platforms', platform.value, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{platform.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Channels *
            </label>
            <div className="space-y-2">
              {[
                { value: 'in_app', label: 'In-App Notifications' },
                { value: 'email', label: 'Email' },
                { value: 'webhook', label: 'Webhook' },
                { value: 'sms', label: 'SMS (Coming Soon)', disabled: true }
              ].map((channel) => (
                <label key={channel.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notification_channels.includes(channel.value as any)}
                    onChange={(e) => handleArrayChange('notification_channels', channel.value, e.target.checked)}
                    disabled={channel.disabled}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`ml-2 text-sm ${channel.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                    {channel.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.notification_channels && <p className="mt-1 text-sm text-red-600">{errors.notification_channels}</p>}
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => handleInputChange('frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Default Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : initialData ? 'Update Alert' : 'Create Alert'}
        </button>
      </div>
    </form>
  )
}