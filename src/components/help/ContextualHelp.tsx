'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Lightbulb, ArrowRight, BookOpen } from 'lucide-react'

interface HelpContent {
  id: string
  title: string
  description: string
  tips: string[]
  relatedActions?: {
    label: string
    action: () => void
  }[]
}

interface ContextualHelpProps {
  context: string
  onDismiss?: () => void
  className?: string
}

export function ContextualHelp({ context, onDismiss, className }: ContextualHelpProps) {
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const content = getHelpContent(context)
    setHelpContent(content)
    
    // Check if user has dismissed this help before
    const dismissedHelp = localStorage.getItem('dismissedHelp') || '[]'
    const dismissed = JSON.parse(dismissedHelp)
    setIsDismissed(dismissed.includes(context))
  }, [context])

  const getHelpContent = (context: string): HelpContent | null => {
    const helpMap: Record<string, HelpContent> = {
      'dashboard': {
        id: 'dashboard',
        title: 'Understanding Your Dashboard',
        description: 'Your dashboard provides an overview of all conversation activity and key metrics.',
        tips: [
          'Use the date range picker to focus on specific time periods',
          'Click on chart elements to drill down into detailed data',
          'The sentiment gauge shows overall brand perception',
          'Recent conversations appear in real-time on the right panel'
        ],
        relatedActions: [
          {
            label: 'View Analytics',
            action: () => window.location.href = '/analytics'
          }
        ]
      },
      'keywords': {
        id: 'keywords',
        title: 'Managing Keywords',
        description: 'Keywords are the terms you want to monitor across all platforms.',
        tips: [
          'Add variations of your brand name and product names',
          'Include common misspellings and abbreviations',
          'Use specific industry terms relevant to your business',
          'Monitor competitor names to track market discussions'
        ],
        relatedActions: [
          {
            label: 'Add Keywords',
            action: () => window.location.href = '/keywords'
          }
        ]
      },
      'search': {
        id: 'search',
        title: 'Searching Conversations',
        description: 'Find specific mentions and conversations using advanced search filters.',
        tips: [
          'Use quotes for exact phrase matching',
          'Combine multiple filters to narrow results',
          'Save frequently used searches as presets',
          'Export search results for further analysis'
        ]
      },
      'analytics': {
        id: 'analytics',
        title: 'Analytics & Insights',
        description: 'Analyze trends and patterns in your conversation data.',
        tips: [
          'Compare different time periods to identify trends',
          'Use sentiment analysis to gauge brand perception',
          'Monitor platform distribution to optimize your presence',
          'Track keyword performance to refine your monitoring'
        ]
      },
      'alerts': {
        id: 'alerts',
        title: 'Setting Up Alerts',
        description: 'Get notified when important conversations happen.',
        tips: [
          'Set different thresholds for different types of mentions',
          'Use sentiment-based alerts for reputation management',
          'Configure volume alerts to catch viral discussions',
          'Choose appropriate notification frequencies to avoid spam'
        ]
      }
    }

    return helpMap[context] || null
  }

  const handleDismiss = () => {
    const dismissedHelp = localStorage.getItem('dismissedHelp') || '[]'
    const dismissed = JSON.parse(dismissedHelp)
    dismissed.push(context)
    localStorage.setItem('dismissedHelp', JSON.stringify(dismissed))
    
    setIsDismissed(true)
    onDismiss?.()
  }

  if (!helpContent || isDismissed) {
    return null
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-blue-900 text-base">
              {helpContent.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Help
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-1 h-auto text-blue-500 hover:text-blue-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-blue-800 text-sm mb-3">
          {helpContent.description}
        </p>
        
        <div className="space-y-2 mb-4">
          {helpContent.tips.map((tip, index) => (
            <div key={index} className="flex items-start text-sm text-blue-700">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2 flex-shrink-0" />
              {tip}
            </div>
          ))}
        </div>

        {helpContent.relatedActions && helpContent.relatedActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {helpContent.relatedActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.action}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                {action.label}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}