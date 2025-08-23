'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Monitor, TrendingUp, Bell, BarChart3 } from 'lucide-react'

interface WelcomeStepProps {
  onComplete: () => void
}

export function WelcomeStep({ onComplete }: WelcomeStepProps) {
  const features = [
    {
      icon: Monitor,
      title: 'Comprehensive Monitoring',
      description: 'Track mentions across social media, forums, news sites, and review platforms'
    },
    {
      icon: TrendingUp,
      title: 'Sentiment Analysis',
      description: 'Understand the tone and emotion behind every conversation about your brand'
    },
    {
      icon: Bell,
      title: 'Real-time Alerts',
      description: 'Get notified instantly when important conversations happen'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Visualize trends and insights with powerful analytics tools'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Monitor Your Brand Across the Internet
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          CustomerSignal helps you stay on top of what people are saying about your brand, 
          products, and industry across the entire web. Here's what you can do:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={onComplete} size="lg" className="px-8">
          Get Started
        </Button>
      </div>
    </div>
  )
}