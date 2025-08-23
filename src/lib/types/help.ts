export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  isPopular?: boolean
  lastUpdated: Date
}

export interface HelpArticle {
  id: string
  title: string
  content: string
  excerpt: string
  category: string
  tags: string[]
  author: string
  publishedAt: Date
  updatedAt: Date
  readTime: number
  rating: number
  views: number
  isPublished: boolean
}

export interface HelpCategory {
  id: string
  name: string
  description: string
  icon: string
  order: number
  articleCount: number
}

export interface SearchResult {
  type: 'article' | 'faq'
  item: HelpArticle | FAQItem
  relevanceScore: number
  matchedTerms: string[]
}