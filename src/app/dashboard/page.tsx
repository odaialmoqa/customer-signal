'use client'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DashboardStats from '@/components/dashboard/DashboardStats'
import ConversationFeed from '@/components/dashboard/ConversationFeed'
import QuickActions from '@/components/dashboard/QuickActions'
import { useTenant } from '@/lib/hooks/useTenant'

export default function Dashboard() {
  const { tenant, profile, loading } = useTenant()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back{tenant ? `, ${tenant.name}` : ''}. Here's what's happening with your brand monitoring.
          </p>
        </div>

        {/* Stats Overview */}
        <DashboardStats />

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Recent Conversations</h2>
            <a
              href="/conversations"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all conversations →
            </a>
          </div>
          <ConversationFeed limit={10} showSearch={false} />
        </div>
      </div>
    </DashboardLayout>
  )
}