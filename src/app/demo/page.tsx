'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DashboardStats from '@/components/dashboard/DashboardStats'
import ConversationFeed from '@/components/dashboard/ConversationFeed'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { ConversationSearch } from '@/components/conversations/ConversationSearch'
import KeywordManagement from '@/components/keywords/KeywordManagement'
import { AlertManagement } from '@/components/alerts/AlertManagement'
import { AdvancedSearchFilters } from '@/components/search/AdvancedSearchFilters'
import { SearchResults } from '@/components/search/SearchResults'

type DemoSection = 
  | 'dashboard' 
  | 'analytics' 
  | 'conversations' 
  | 'search' 
  | 'keywords' 
  | 'alerts'

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState<DemoSection>('dashboard')
  const [searchFilters, setSearchFilters] = useState({})

  const sections = [
    { id: 'dashboard' as const, name: 'Dashboard', description: 'Main dashboard with stats and conversation feed' },
    { id: 'analytics' as const, name: 'Analytics', description: 'Charts and trend analysis' },
    { id: 'conversations' as const, name: 'Conversations', description: 'Search and view conversations' },
    { id: 'search' as const, name: 'Advanced Search', description: 'Advanced filtering and saved searches' },
    { id: 'keywords' as const, name: 'Keywords', description: 'Manage monitoring keywords' },
    { id: 'alerts' as const, name: 'Alerts', description: 'Alert configuration and management' }
  ]

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardLayout>
            <div className="space-y-6">
              <DashboardStats />
              <ConversationFeed />
            </div>
          </DashboardLayout>
        )
      
      case 'analytics':
        return <AnalyticsDashboard />
      
      case 'conversations':
        return <ConversationSearch />
      
      case 'search':
        return (
          <div className="space-y-6">
            <AdvancedSearchFilters 
              onFiltersChange={setSearchFilters}
              initialFilters={searchFilters}
            />
            <SearchResults filters={searchFilters} />
          </div>
        )
      
      case 'keywords':
        return <KeywordManagement />
      
      case 'alerts':
        return <AlertManagement />
      
      default:
        return <div>Select a section to view</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Signal Demo</h1>
              <p className="text-sm text-gray-600">Explore the implemented features</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                16 Tasks Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{section.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Implementation Status */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Implementation Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Authentication</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multi-tenancy</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Keywords</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Monitoring</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Social Media</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sentiment Analysis</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Alerts</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Integration</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Conversations</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trend Analysis</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analytics</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dashboard</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Search & Filters</span>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {sections.find(s => s.id === activeSection)?.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {sections.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              <div className="p-6">
                {renderActiveSection()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Working</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">🔐 Authentication & Security</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Multi-tenant architecture</li>
                <li>• Row-level security</li>
                <li>• User management</li>
                <li>• Role-based access</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">📊 Data Collection</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Social media monitoring</li>
                <li>• Web scraping</li>
                <li>• API integrations</li>
                <li>• CRM data import</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">🧠 AI & Analysis</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sentiment analysis</li>
                <li>• Trend detection</li>
                <li>• Story surfacing</li>
                <li>• Cross-platform insights</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">🔍 Search & Discovery</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Advanced filtering</li>
                <li>• Full-text search</li>
                <li>• Saved searches</li>
                <li>• Similar conversations</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">📈 Analytics & Reporting</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Interactive charts</li>
                <li>• Keyword performance</li>
                <li>• Platform distribution</li>
                <li>• Sentiment trends</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">🚨 Alerts & Notifications</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time alerts</li>
                <li>• Email notifications</li>
                <li>• Custom thresholds</li>
                <li>• Alert management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}