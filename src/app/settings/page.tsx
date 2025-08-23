'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import UserProfileSettings from '@/components/settings/UserProfileSettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import TenantSettings from '@/components/settings/TenantSettings'
import TeamManagement from '@/components/team/TeamManagement'

type SettingsTab = 'profile' | 'notifications' | 'tenant' | 'team'

export default function SettingsPage() {
  const { tenant, profile, loading } = useTenant()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenant || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please complete your account setup.</p>
        </div>
      </div>
    )
  }

  const tabs: { id: SettingsTab; label: string; description: string }[] = [
    { id: 'profile', label: 'Profile', description: 'Manage your personal profile and account settings' },
    { id: 'notifications', label: 'Notifications', description: 'Configure your notification preferences' },
    { id: 'tenant', label: 'Workspace', description: 'Manage workspace settings and configuration' },
    { id: 'team', label: 'Team', description: 'Manage team members and invitations' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <UserProfileSettings />
      case 'notifications':
        return <NotificationSettings />
      case 'tenant':
        return <TenantSettings />
      case 'team':
        return <TeamManagement />
      default:
        return <UserProfileSettings />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your {tenant.name} workspace settings and preferences.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Settings Navigation */}
            <div className="lg:w-1/4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{tab.description}</div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Settings Content */}
            <div className="lg:w-3/4">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}