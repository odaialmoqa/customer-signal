import { FAQItem, HelpArticle, HelpCategory, SearchResult } from '@/lib/types/help'

export class HelpService {
  private static instance: HelpService
  private faqs: FAQItem[] = []
  private articles: HelpArticle[] = []
  private categories: HelpCategory[] = []

  constructor() {
    this.initializeData()
  }

  static getInstance(): HelpService {
    if (!HelpService.instance) {
      HelpService.instance = new HelpService()
    }
    return HelpService.instance
  }

  private initializeData() {
    // Initialize categories
    this.categories = [
      {
        id: 'getting-started',
        name: 'Getting Started',
        description: 'Learn the basics of CustomerSignal',
        icon: 'play-circle',
        order: 1,
        articleCount: 8
      },
      {
        id: 'keywords',
        name: 'Keywords & Monitoring',
        description: 'Managing keywords and monitoring setup',
        icon: 'search',
        order: 2,
        articleCount: 6
      },
      {
        id: 'analytics',
        name: 'Analytics & Reports',
        description: 'Understanding your data and insights',
        icon: 'bar-chart',
        order: 3,
        articleCount: 5
      },
      {
        id: 'alerts',
        name: 'Alerts & Notifications',
        description: 'Setting up and managing alerts',
        icon: 'bell',
        order: 4,
        articleCount: 3
      },
      {
        id: 'integrations',
        name: 'Integrations',
        description: 'Connecting external platforms',
        icon: 'link',
        order: 5,
        articleCount: 4
      },
      {
        id: 'account',
        name: 'Account & Billing',
        description: 'Managing your account and subscription',
        icon: 'user',
        order: 6,
        articleCount: 3
      }
    ]

    // Initialize FAQs
    this.faqs = [
      {
        id: '1',
        question: 'How do I add keywords to monitor?',
        answer: 'Go to the Keywords page and click "Add Keyword". Enter your keyword, select the platforms you want to monitor, and configure alert settings. You can add multiple keywords at once by separating them with commas.',
        category: 'keywords',
        tags: ['keywords', 'monitoring', 'setup'],
        isPopular: true,
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: '2',
        question: 'What platforms does CustomerSignal monitor?',
        answer: 'We monitor Twitter/X, Reddit, LinkedIn, Instagram, YouTube, news sites, forums, review platforms (Google Reviews, Yelp, Trustpilot), and many other sources across the web.',
        category: 'getting-started',
        tags: ['platforms', 'monitoring', 'coverage'],
        isPopular: true,
        lastUpdated: new Date('2024-01-10')
      },
      {
        id: '3',
        question: 'How accurate is the sentiment analysis?',
        answer: 'Our sentiment analysis uses advanced AI models with an accuracy rate of over 85%. The system analyzes context, tone, and emotion to provide nuanced sentiment scores beyond simple positive/negative classifications.',
        category: 'analytics',
        tags: ['sentiment', 'accuracy', 'ai'],
        isPopular: true,
        lastUpdated: new Date('2024-01-12')
      },
      {
        id: '4',
        question: 'Can I export my data and reports?',
        answer: 'Yes, you can export data in multiple formats including PDF reports, Excel spreadsheets, and CSV files. Go to the Reports section to generate and download custom reports.',
        category: 'analytics',
        tags: ['export', 'reports', 'data'],
        lastUpdated: new Date('2024-01-08')
      },
      {
        id: '5',
        question: 'How do I set up alerts for negative mentions?',
        answer: 'In the Alerts section, create a new alert rule. Set the sentiment threshold to "Negative" and choose your notification preferences. You can also set volume thresholds and specific keywords for more targeted alerts.',
        category: 'alerts',
        tags: ['alerts', 'negative', 'notifications'],
        lastUpdated: new Date('2024-01-14')
      },
      {
        id: '6',
        question: 'What integrations are available?',
        answer: 'We integrate with major CRM and support platforms including Salesforce, Zendesk, HubSpot, Intercom, and Freshdesk. You can also upload CSV/Excel files for custom data integration.',
        category: 'integrations',
        tags: ['integrations', 'crm', 'support'],
        lastUpdated: new Date('2024-01-11')
      },
      {
        id: '7',
        question: 'How often is data updated?',
        answer: 'Data is updated in real-time for most platforms. Some sources may have slight delays due to API limitations, but most mentions appear within minutes of being posted.',
        category: 'getting-started',
        tags: ['real-time', 'updates', 'frequency'],
        lastUpdated: new Date('2024-01-13')
      },
      {
        id: '8',
        question: 'Can I invite team members to my account?',
        answer: 'Yes, you can invite team members from the Settings page. Different roles are available including Admin, Editor, and Viewer with varying levels of access to features and data.',
        category: 'account',
        tags: ['team', 'collaboration', 'roles'],
        lastUpdated: new Date('2024-01-09')
      }
    ]

    // Initialize articles (simplified for demo)
    this.articles = [
      {
        id: '1',
        title: 'Getting Started with CustomerSignal',
        content: 'Complete guide to setting up your account...',
        excerpt: 'Learn how to set up your account and start monitoring conversations',
        category: 'getting-started',
        tags: ['setup', 'onboarding', 'basics'],
        author: 'CustomerSignal Team',
        publishedAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        readTime: 5,
        rating: 4.8,
        views: 1250,
        isPublished: true
      },
      {
        id: '2',
        title: 'Advanced Keyword Strategies',
        content: 'Best practices for choosing and organizing keywords...',
        excerpt: 'Master keyword selection and organization for better monitoring results',
        category: 'keywords',
        tags: ['keywords', 'strategy', 'best-practices'],
        author: 'CustomerSignal Team',
        publishedAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-12'),
        readTime: 8,
        rating: 4.6,
        views: 890,
        isPublished: true
      }
    ]
  }

  async getFAQs(category?: string): Promise<FAQItem[]> {
    let faqs = this.faqs
    if (category && category !== 'all') {
      faqs = faqs.filter(faq => faq.category === category)
    }
    return faqs.sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1
      if (!a.isPopular && b.isPopular) return 1
      return b.lastUpdated.getTime() - a.lastUpdated.getTime()
    })
  }

  async getArticles(category?: string): Promise<HelpArticle[]> {
    let articles = this.articles.filter(article => article.isPublished)
    if (category && category !== 'all') {
      articles = articles.filter(article => article.category === category)
    }
    return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  }

  async getCategories(): Promise<HelpCategory[]> {
    return this.categories.sort((a, b) => a.order - b.order)
  }

  async searchHelp(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)

    // Search FAQs
    for (const faq of this.faqs) {
      const matchedTerms: string[] = []
      let relevanceScore = 0

      for (const term of searchTerms) {
        if (faq.question.toLowerCase().includes(term)) {
          matchedTerms.push(term)
          relevanceScore += 2
        }
        if (faq.answer.toLowerCase().includes(term)) {
          matchedTerms.push(term)
          relevanceScore += 1
        }
        if (faq.tags.some(tag => tag.toLowerCase().includes(term))) {
          matchedTerms.push(term)
          relevanceScore += 1
        }
      }

      if (matchedTerms.length > 0) {
        results.push({
          type: 'faq',
          item: faq,
          relevanceScore,
          matchedTerms: [...new Set(matchedTerms)]
        })
      }
    }

    // Search Articles
    for (const article of this.articles.filter(a => a.isPublished)) {
      const matchedTerms: string[] = []
      let relevanceScore = 0

      for (const term of searchTerms) {
        if (article.title.toLowerCase().includes(term)) {
          matchedTerms.push(term)
          relevanceScore += 3
        }
        if (article.excerpt.toLowerCase().includes(term)) {
          matchedTerms.push(term)
          relevanceScore += 2
        }
        if (article.content.toLowerCase().includes(term)) {
          matchedTerms.push(term)
          relevanceScore += 1
        }
        if (article.tags.some(tag => tag.toLowerCase().includes(term))) {
          matchedTerms.push(term)
          relevanceScore += 1
        }
      }

      if (matchedTerms.length > 0) {
        results.push({
          type: 'article',
          item: article,
          relevanceScore,
          matchedTerms: [...new Set(matchedTerms)]
        })
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  async getFAQById(id: string): Promise<FAQItem | null> {
    return this.faqs.find(faq => faq.id === id) || null
  }

  async getArticleById(id: string): Promise<HelpArticle | null> {
    return this.articles.find(article => article.id === id && article.isPublished) || null
  }

  async getPopularFAQs(limit: number = 5): Promise<FAQItem[]> {
    return this.faqs
      .filter(faq => faq.isPopular)
      .slice(0, limit)
  }

  async getPopularArticles(limit: number = 5): Promise<HelpArticle[]> {
    return this.articles
      .filter(article => article.isPublished)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
  }
}

export const helpService = HelpService.getInstance()