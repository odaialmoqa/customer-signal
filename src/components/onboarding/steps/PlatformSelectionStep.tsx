'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Twitter, 
  MessageCircle, 
  Newspaper, 
  Star, 
  Users, 
  Youtube,
  Instagram,
  Linkedin
} from 'lucide-react'

interface PlatformSelectionStepProps {
  onComplete: () => void
}

interface Platform {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  category: 'social' | 'news' | 'reviews' | 'forums'
  isPopular?: boolean
}

export function PlatformSelectionStep({ onComplete }: PlatformSelectionStepProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'twitter', 'reddit', 'news', 'google-reviews'
  ])

  const platforms: Platform[] = [
    // Social Media
    {
      id: 'twitter',
      name: 'Twitter/X',
      description: 'Monitor tweets and mentions',
      icon: Twitter,
      category: 'social',
      isPopular: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Professional discussions and posts',
      icon: Linkedin,
      category: 'social'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Posts and stories with hashtags',
      icon: Instagram,
      category: 'social'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Video comments and descriptions',
      icon: Youtube,
      category: 'social'
    },
    // Forums
    {
      id: 'reddit',
      name: 'Reddit',
      description: 'Discussions across subreddits',
      icon: MessageCircle,
      category: 'forums',
      isPopular: true
    },
    {
      id: 'forums',
      name: 'Forums',
      description: 'Industry-specific forums and communities',
      icon: Users,
      category: 'forums'
    },
    // News
    {
      id: 'news',
      name: 'News Sites',
      description: 'Articles from major news outlets',
      icon: Newspaper,
      category: 'news',
      isPopular: true
    },
    // Reviews
    {
      id: 'google-reviews',
      name: 'Google Reviews',
      description: 'Business reviews and ratings',
      icon: Star,
      category: 'reviews',
      isPopular: true
    },
    {
      id: 'yelp',
      name: 'Yelp',
      description: 'Local business reviews',
      icon: Star,
      category: 'reviews'
    },
    {
      id: 'trustpilot',
      name: 'Trustpilot',
      description: 'Customer reviews and ratings',
      icon: Star,
      category: 'reviews'
    }
  ]

  const categories = [
    { id: 'social', name: 'Social Media', color: 'bg-blue-100 text-blue-800' },
    { id: 'forums', name: 'Forums & Communities', color: 'bg-green-100 text-green-800' },
    { id: 'news', name: 'News & Media', color: 'bg-purple-100 text-purple-800' },
    { id: 'reviews', name: 'Reviews & Ratings', color: 'bg-orange-100 text-orange-800' }
  ]

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const selectAllInCategory = (category: string) => {
    const categoryPlatforms = platforms
      .filter(p => p.category === category)
      .map(p => p.id)
    
    const allSelected = categoryPlatforms.every(id => selectedPlatforms.includes(id))
    
    if (allSelected) {
      setSelectedPlatforms(prev => prev.filter(id => !categoryPlatforms.includes(id)))
    } else {
      setSelectedPlatforms(prev => [...new Set([...prev, ...categoryPlatforms])])
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Choose Platforms to Monitor
        </h2>
        <p className="text-gray-600">
          Select the platforms where you want to track conversations about your keywords
        </p>
      </div>

      <div className="text-center">
        <Badge variant="secondary" className="px-3 py-1">
          {selectedPlatforms.length} platforms selected
        </Badge>
      </div>

      {categories.map(category => {
        const categoryPlatforms = platforms.filter(p => p.category === category.id)
        const selectedInCategory = categoryPlatforms.filter(p => selectedPlatforms.includes(p.id)).length
        
        return (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={category.color}>
                  {category.name}
                </Badge>
                <span className="text-sm text-gray-500">
                  {selectedInCategory}/{categoryPlatforms.length} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectAllInCategory(category.id)}
              >
                {selectedInCategory === categoryPlatforms.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryPlatforms.map(platform => (
                <Card
                  key={platform.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <platform.icon className="w-4 h-4" />
                          <span className="font-medium">{platform.name}</span>
                          {platform.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {platform.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onComplete}
        >
          Skip for Now
        </Button>
        <Button
          onClick={onComplete}
          disabled={selectedPlatforms.length === 0}
        >
          Continue with {selectedPlatforms.length} Platforms
        </Button>
      </div>
    </div>
  )
}