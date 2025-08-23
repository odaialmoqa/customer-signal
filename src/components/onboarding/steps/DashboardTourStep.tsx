'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Search, 
  Filter, 
  Bell, 
  Settings, 
  Download,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

interface DashboardTourStepProps {
  onComplete: () => void
}

interface TourFeature {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  category: 'analytics' | 'search' | 'alerts' | 'settings'
}

export function DashboardTourStep({ onComplete }: DashboardTourStepProps) {
  const [completedFeatures, setCompletedFeatures] = useState<string[]>([])

  const features: TourFeature[] = [
    {
      id: 'dashboard',
      title: 'Analytics Dashboard',
      description: 'View sentiment trends, conversation volume, and platform distribution',
      icon: BarChart3,
      category: 'analytics'
    },
    {
      id: 'search',
      title: 'Conversation Search',
      description: 'Find specific mentions and conversations with powerful search filters',
      icon: Search,
      category: 'search'
    },
    {
      id: 'filters',
      title: 'Advanced Filtering',
      description: 'Filter by date range, sentiment, platform, and keywords',
      icon: Filter,
      category: 'search'
    },
    {
      id: 'alerts',
      title: 'Alert Management',
      description: 'Configure and manage your notification preferences',
      icon: Bell,
      category: 'alerts'
    },
    {
      id: 'reports',
      title: 'Export Reports',
      description: 'Generate and download comprehensive reports for stakeholders',
      icon: Download,
      category: 'analytics'
    },
    {
      id: 'settings',
      title: 'Account Settings',
      description: 'Manage your profile, team members, and platform integrations',
      icon: Settings,
      category: 'settings'
    }
  ]

  const categories = [
    { id: 'analytics', name: 'Analytics', color: 'bg-blue-100 text-blue-800' },
    { id: 'search', name: 'Search & Discovery', color: 'bg-green-100 text-green-800' },
    { id: 'alerts', name: 'Alerts & Notifications', color: 'bg-orange-100 text-orange-800' },
    { id: 'settings', name: 'Settings & Management', color: 'bg-purple-100 text-purple-800' }
  ]

  const toggleFeature = (featureId: string) => {
    setCompletedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const quickTips = [
    'Use keyboard shortcuts: Ctrl+K to open search, Ctrl+D for dashboard',
    'Click on any chart element to drill down into detailed data',
    'Save frequently used filter combinations as presets',
    'Set up alerts for your most important keywords first',
    'Export reports regularly to track progress over time'
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Explore Your Dashboard
        </h2>
        <p className="text-gray-600">
          Get familiar with the key features that will help you monitor and analyze conversations
        </p>
      </div>

      <div className="text-center">
        <Badge variant="secondary" className="px-3 py-1">
          {completedFeatures.length}/{features.length} features explored
        </Badge>
      </div>

      {categories.map(category => {
        const categoryFeatures = features.filter(f => f.category === category.id)
        const completedInCategory = categoryFeatures.filter(f => completedFeatures.includes(f.id)).length
        
        return (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center space-x-2">
              <Badge className={category.color}>
                {category.name}
              </Badge>
              <span className="text-sm text-gray-500">
                {completedInCategory}/{categoryFeatures.length} explored
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {categoryFeatures.map(feature => {
                const isCompleted = completedFeatures.includes(feature.id)
                
                return (
                  <Card
                    key={feature.id}
                    className={`cursor-pointer transition-colors ${
                      isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}
                        `}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <feature.icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {feature.description}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Quick Tips */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-yellow-900 mb-3">
            💡 Quick Tips for Getting Started
          </h3>
          <ul className="text-sm text-yellow-800 space-y-2">
            {quickTips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2 mt-2 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onComplete}
        >
          Skip Tour
        </Button>
        <Button onClick={onComplete}>
          {completedFeatures.length === features.length 
            ? 'Complete Setup' 
            : 'Finish Later'
          }
        </Button>
      </div>
    </div>
  )
}