'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Clock,
  MessageCircle
} from 'lucide-react'
import { helpService } from '@/lib/services/help'
import { FAQItem, HelpCategory } from '@/lib/types/help'

interface FAQSectionProps {
  category?: string
  showSearch?: boolean
  limit?: number
}

export function FAQSection({ category = 'all', showSearch = true, limit }: FAQSectionProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(category)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [faqData, categoryData] = await Promise.all([
        helpService.getFAQs(selectedCategory),
        helpService.getCategories()
      ])
      
      let filteredFaqs = faqData
      if (searchQuery) {
        filteredFaqs = faqData.filter(faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }
      
      if (limit) {
        filteredFaqs = filteredFaqs.slice(0, limit)
      }
      
      setFaqs(filteredFaqs)
      setCategories(categoryData)
    } catch (error) {
      console.error('Failed to load FAQ data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadData()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    setExpandedItems(new Set(faqs.map(faq => faq.id)))
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 mt-1">
            Find quick answers to common questions
          </p>
        </div>
        {faqs.length > 0 && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Category Filter */}
      {showSearch && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Categories
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {faqs.map(faq => {
          const isExpanded = expandedItems.has(faq.id)
          
          return (
            <Card key={faq.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {faq.question}
                        </h3>
                        {faq.isPopular && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3" />
                          <span className="capitalize">{faq.category.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Updated {faq.lastUpdated.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="border-t pt-4">
                      <p className="text-gray-700 leading-relaxed">
                        {faq.answer}
                      </p>
                      {faq.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {faq.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {faqs.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No FAQs found
          </h3>
          <p className="text-gray-600">
            {searchQuery 
              ? 'Try adjusting your search terms or browse different categories'
              : 'No frequently asked questions are available for this category'
            }
          </p>
        </div>
      )}
    </div>
  )
}