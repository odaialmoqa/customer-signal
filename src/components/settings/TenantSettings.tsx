'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import { TenantService } from '@/lib/services/tenant'
import type { Tenant } from '@/lib/types/tenant'

interface TenantConfiguration {
  data_retention_days: number
  max_keywords: number
  monitoring_frequency: 'realtime' | 'hourly' | 'daily'
  auto_sentiment_analysis: boolean
  auto_tagging: boolean
  api_rate_limits: {
    enabled: boolean
    requests_per_minute: number
  }
  integrations: {
    max_connections: number
    auto_sync_enabled: boolean
    sync_frequency_hours: number
  }
  security: {
    require_mfa: boolean
    session_timeout_minutes: number
    ip_whitelist_enabled: boolean
    ip_whitelist: string[]
  }
  branding: {
    company_logo_url: string
    primary_color: string
    custom_domain: string
  }
}

const defaultConfiguration: TenantConfiguration = {
  data_retention_days: 365,
  max_keywords: 50,
  monitoring_frequency: 'hourly',
  auto_sentiment_analysis: true,
  auto_tagging: false,
  api_rate_limits: {
    enabled: true,
    requests_per_minute: 100
  },
  integrations: {
    max_connections: 5,
    auto_sync_enabled: true,
    sync_frequency_hours: 24
  },
  security: {
    require_mfa: false,
    session_timeout_minutes: 480,
    ip_whitelist_enabled: false,
    ip_whitelist: []
  },
  branding: {
    company_logo_url: '',
    primary_color: '#3B82F6',
    custom_domain: ''
  }
}

export default function TenantSettings() {
  const { tenant, profile, canManageTenant } = useTenant()
  const [configuration, setConfiguration] = useState<TenantConfiguration>(defaultConfiguration)
  const [tenantName, setTenantName] = useState('')
  const [subscription, setSubscription] = useState<'free' | 'pro' | 'enterprise'>('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const tenantService = new TenantService()

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name)
      setSubscription(tenant.subscription)
      
      if (tenant.settings) {
        setConfiguration({
          ...defaultConfiguration,
          ...tenant.settings
        })
      }
    }
  }, [tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !canManageTenant()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await tenantService.updateTenant(tenant.id, {
        name: tenantName.trim(),
        subscription,
        settings: configuration
      })

      setSuccess('Tenant settings updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const updateConfiguration = (key: keyof TenantConfiguration, value: any) => {
    setConfiguration(prev => ({ ...prev, [key]: value }))
    setError(null)
    setSuccess(null)
  }

  const updateNestedConfiguration = (
    section: keyof TenantConfiguration,
    key: string,
    value: any
  ) => {
    setConfiguration(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setError(null)
    setSuccess(null)
  }

  const addIpToWhitelist = () => {
    const ip = prompt('Enter IP address to whitelist:')
    if (ip && ip.trim()) {
      updateNestedConfiguration('security', 'ip_whitelist', [
        ...configuration.security.ip_whitelist,
        ip.trim()
      ])
    }
  }

  const removeIpFromWhitelist = (index: number) => {
    const newList = configuration.security.ip_whitelist.filter((_, i) => i !== index)
    updateNestedConfiguration('security', 'ip_whitelist', newList)
  }

  if (!tenant || !profile) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading tenant settings...</p>
      </div>
    )
  }

  if (!canManageTenant()) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Settings</h2>
        <p className="text-gray-600">You don't have permission to manage tenant settings.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Tenant Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenant_name" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                id="tenant_name"
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="subscription" className="block text-sm font-medium text-gray-700">
                Subscription Plan
              </label>
              <select
                id="subscription"
                value={subscription}
                onChange={(e) => setSubscription(e.target.value as 'free' | 'pro' | 'enterprise')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Monitoring Configuration */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Monitoring Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data Retention (Days)
              </label>
              <input
                type="number"
                min="30"
                max="2555"
                value={configuration.data_retention_days}
                onChange={(e) => updateConfiguration('data_retention_days', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Max Keywords
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={configuration.max_keywords}
                onChange={(e) => updateConfiguration('max_keywords', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Default Monitoring Frequency
              </label>
              <select
                value={configuration.monitoring_frequency}
                onChange={(e) => updateConfiguration('monitoring_frequency', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.auto_sentiment_analysis}
                onChange={(e) => updateConfiguration('auto_sentiment_analysis', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Enable automatic sentiment analysis
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.auto_tagging}
                onChange={(e) => updateConfiguration('auto_tagging', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Enable automatic tagging based on content analysis
              </span>
            </label>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Security Settings</h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.security.require_mfa}
                onChange={(e) => updateNestedConfiguration('security', 'require_mfa', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Require multi-factor authentication for all users
              </span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Timeout (Minutes)
                </label>
                <input
                  type="number"
                  min="30"
                  max="1440"
                  value={configuration.security.session_timeout_minutes}
                  onChange={(e) => updateNestedConfiguration('security', 'session_timeout_minutes', parseInt(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={configuration.security.ip_whitelist_enabled}
                  onChange={(e) => updateNestedConfiguration('security', 'ip_whitelist_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Enable IP address whitelist
                </span>
              </label>
              
              {configuration.security.ip_whitelist_enabled && (
                <div className="ml-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Whitelisted IP Addresses</span>
                    <button
                      type="button"
                      onClick={addIpToWhitelist}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Add IP
                    </button>
                  </div>
                  <div className="space-y-1">
                    {configuration.security.ip_whitelist.map((ip, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm text-gray-900">{ip}</span>
                        <button
                          type="button"
                          onClick={() => removeIpFromWhitelist(index)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {configuration.security.ip_whitelist.length === 0 && (
                      <p className="text-sm text-gray-500">No IP addresses whitelisted</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Branding */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Branding</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Logo URL
              </label>
              <input
                type="url"
                value={configuration.branding.company_logo_url}
                onChange={(e) => updateNestedConfiguration('branding', 'company_logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <input
                  id="primary_color"
                  type="color"
                  value={configuration.branding.primary_color}
                  onChange={(e) => updateNestedConfiguration('branding', 'primary_color', e.target.value)}
                  className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={configuration.branding.custom_domain}
                  onChange={(e) => updateNestedConfiguration('branding', 'custom_domain', e.target.value)}
                  placeholder="app.yourcompany.com"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
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
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}