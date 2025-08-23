'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  BookOpen, 
  Video, 
  MessageCircle, 
  ExternalLink,
  ChevronRight,
  Star,
  Clock
} from 'lucide-react'

interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  type: 'article' | 'video' | 'tutorial'
  readTime: string
  rating: number
  isPopular?: boolean
  url: string
}

interface HelpCenterProps {
  onClose?: () => void
}

export function HelpCenter({ onClose }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Topics', count: 24 },
    { id: 'getting-started', name: 'Getting Started', count: 8 },
    { id: 'keywords', name: 'Keywords & Monitoring', count: 6 },
    { id: 'analytics', name: 'Analytics & Reports', count: 5 },
    { id: 'alerts', name: 'Alerts & Notifications', count: 3 },
    { id: 'integrations', name: 'Integrations', count: 2 }
  ]

  const articles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started with CustomerSignal',
      description: 'Learn the basics of setting up your account and monitoring keywords',
      category: 'getting-started',
      type: 'tutorial',
      readTime: '5 min',
      rating: 4.8,
      isPopular: true,
      url: '/help/getting-started'
    },
    {
      id: '2',
      title: 'How to Add and Manage Keywords',
      description: 'Best practices for choosing and organizing your monitoring keywords',
      category: 'keywords',
      type: 'article',
      readTime: '3 min',
      rating: 4.6,
      isPopular: true,
      url: '/help/keywords-guide'
    },
    {
      id: '3',
      title: 'Understanding Sentiment Analysis',
      description: 'Learn how our AI analyzes the tone and emotion in conversations',
      category: 'analytics',
      type: 'video',
      readTime: '8 min',
      rating: 4.7,
      url: '/help/sentiment-analysis'
    },
    {
      id: '4',
      title: 'Setting Up Smart Alerts',
      description: 'Configure notifications to stay informed about important mentions',
      category: 'alerts',
      type: 'tutorial',
      readTime: '4 min',
      rating: 4.5,
      url: '/help/smart-alerts'
    },
    {
      id: '5',
      title: 'Connecting Your CRM and Support Tools',
      description: 'Integrate with Salesforce, Zendesk, and other platforms',
      category: 'integrations',
      type: 'article',
      readTime: '6 min',
      rating: 4.4,
      url: '/help/integrations'
    },
    {
      id: '6',
      title: 'Advanced Search and Filtering',
      description: 'Master the search features to find exactly what you need',
      category: 'getting-started',
      type: 'tutorial',
      readTime: '7 min',
      rating: 4.6,
      url: '/help/advanced-search'
    }
  ]

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const popularArticles = articles.filter(article => article.isPopular)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />
      case 'tutorial':
        return <BookOpen className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800'
      case 'tutorial':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Help Center
        </h1>
        <p className="text-gray-600">
          Find answers, learn best practices, and get the most out of CustomerSignal
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors
                      ${selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Need More Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Video className="w-4 h-4 mr-2" />
                Video Tutorials
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Popular Articles */}
          {searchQuery === '' && selectedCategory === 'all' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Popular Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularArticles.map(article => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getTypeColor(article.type)} variant="secondary">
                          <div className="flex items-center space-x-1">
                            {getTypeIcon(article.type)}
                            <span className="capitalize">{article.type}</span>
                          </div>
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {article.rating}
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{article.readTime}</span>
                        </div>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedCategory === 'all' ? 'All Articles' : 
                 categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <span className="text-sm text-gray-500">
                {filteredArticles.length} articles
              </span>
            </div>

            <div className="space-y-4">
              {filteredArticles.map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getTypeColor(article.type)} variant="secondary">
                            <div className="flex items-center space-x-1">
                              {getTypeIcon(article.type)}
                              <span className="capitalize">{article.type}</span>
                            </div>
                          </Badge>
                          {article.isPopular && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {article.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{article.readTime}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{article.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or browse different categories
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}