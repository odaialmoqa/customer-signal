'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Lightbulb } from 'lucide-react'
import { useKeywords } from '@/lib/hooks/useKeywords'

interface KeywordSetupStepProps {
  onComplete: () => void
}

export function KeywordSetupStep({ onComplete }: KeywordSetupStepProps) {
  const [newKeyword, setNewKeyword] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addKeyword } = useKeywords()

  const suggestions = [
    'Your company name',
    'Product names',
    'CEO or founder names',
    'Brand hashtags',
    'Competitor names',
    'Industry terms'
  ]

  const addKeywordToList = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }

  const handleSubmit = async () => {
    if (keywords.length === 0) return

    setIsSubmitting(true)
    try {
      // Add keywords to the system
      for (const keyword of keywords) {
        await addKeyword({
          keyword,
          platforms: ['twitter', 'reddit', 'news', 'forums'],
          alertThreshold: 0.7,
          isActive: true
        })
      }
      onComplete()
    } catch (error) {
      console.error('Failed to add keywords:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeywordToList()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Add Keywords to Monitor
        </h2>
        <p className="text-gray-600">
          Start by adding keywords related to your brand, products, or industry
        </p>
      </div>

      {/* Keyword Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="keyword">Add a keyword</Label>
          <div className="flex space-x-2 mt-1">
            <Input
              id="keyword"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., your company name"
              className="flex-1"
            />
            <Button
              onClick={addKeywordToList}
              disabled={!newKeyword.trim()}
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Added Keywords */}
        {keywords.length > 0 && (
          <div>
            <Label>Keywords to monitor ({keywords.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Keyword Suggestions
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isSubmitting}
        >
          Skip for Now
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={keywords.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Adding Keywords...' : `Add ${keywords.length} Keywords`}
        </Button>
      </div>
    </div>
  )
}