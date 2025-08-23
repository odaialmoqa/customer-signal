import { InteractiveTour, TourStep } from '@/lib/types/onboarding'

export class TutorialService {
  private static instance: TutorialService
  private tours: InteractiveTour[] = []

  constructor() {
    this.initializeTours()
  }

  static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService()
    }
    return TutorialService.instance
  }

  private initializeTours() {
    this.tours = [
      {
        id: 'dashboard-tour',
        name: 'Dashboard Overview',
        description: 'Learn how to navigate and use your main dashboard',
        isActive: true,
        steps: [
          {
            target: '[data-tour="dashboard-stats"]',
            title: 'Key Metrics',
            content: 'These cards show your most important metrics at a glance: total mentions, sentiment breakdown, and recent activity.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="sentiment-chart"]',
            title: 'Sentiment Trends',
            content: 'This chart shows how sentiment about your brand has changed over time. Click on data points to see specific mentions.',
            placement: 'top'
          },
          {
            target: '[data-tour="conversation-feed"]',
            title: 'Recent Conversations',
            content: 'See the latest mentions and conversations about your keywords. Click on any item to view details.',
            placement: 'left'
          },
          {
            target: '[data-tour="quick-actions"]',
            title: 'Quick Actions',
            content: 'Use these buttons to quickly add keywords, create alerts, or generate reports.',
            placement: 'top'
          }
        ]
      },
      {
        id: 'keyword-management-tour',
        name: 'Keyword Management',
        description: 'Learn how to add and manage your monitoring keywords',
        isActive: true,
        steps: [
          {
            target: '[data-tour="add-keyword-btn"]',
            title: 'Add New Keywords',
            content: 'Click here to add new keywords to monitor. You can add multiple keywords at once.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="keyword-list"]',
            title: 'Your Keywords',
            content: 'This list shows all your active keywords. You can edit settings, view performance, or pause monitoring.',
            placement: 'top'
          },
          {
            target: '[data-tour="keyword-filters"]',
            title: 'Filter Keywords',
            content: 'Use these filters to find specific keywords or sort by performance metrics.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="keyword-performance"]',
            title: 'Performance Metrics',
            content: 'See how each keyword is performing with mention counts, sentiment scores, and trend indicators.',
            placement: 'left'
          }
        ]
      },
      {
        id: 'search-tutorial',
        name: 'Advanced Search',
        description: 'Master the search and filtering features',
        isActive: true,
        steps: [
          {
            target: '[data-tour="search-input"]',
            title: 'Search Conversations',
            content: 'Enter keywords or phrases to search through all your captured conversations. Use quotes for exact matches.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="search-filters"]',
            title: 'Advanced Filters',
            content: 'Narrow down your search with filters for date range, sentiment, platform, and more.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="saved-searches"]',
            title: 'Saved Searches',
            content: 'Save frequently used search queries for quick access later.',
            placement: 'left'
          },
          {
            target: '[data-tour="search-results"]',
            title: 'Search Results',
            content: 'Results are ranked by relevance. Click on any result to view the full conversation context.',
            placement: 'top'
          }
        ]
      },
      {
        id: 'analytics-tour',
        name: 'Analytics Dashboard',
        description: 'Understand your analytics and insights',
        isActive: true,
        steps: [
          {
            target: '[data-tour="analytics-filters"]',
            title: 'Time Range & Filters',
            content: 'Adjust the time range and apply filters to focus on specific data segments.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="sentiment-breakdown"]',
            title: 'Sentiment Analysis',
            content: 'See the distribution of positive, negative, and neutral mentions over time.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="platform-distribution"]',
            title: 'Platform Insights',
            content: 'Understand which platforms generate the most conversations about your brand.',
            placement: 'top'
          },
          {
            target: '[data-tour="keyword-performance-chart"]',
            title: 'Keyword Performance',
            content: 'Compare how different keywords are performing and identify trending topics.',
            placement: 'top'
          },
          {
            target: '[data-tour="export-report"]',
            title: 'Export Reports',
            content: 'Generate and download comprehensive reports to share with your team.',
            placement: 'left'
          }
        ]
      },
      {
        id: 'alerts-setup-tour',
        name: 'Alert Configuration',
        description: 'Set up smart alerts for important mentions',
        isActive: true,
        steps: [
          {
            target: '[data-tour="create-alert"]',
            title: 'Create New Alert',
            content: 'Click here to create a new alert rule for specific keywords or conditions.',
            placement: 'bottom'
          },
          {
            target: '[data-tour="alert-conditions"]',
            title: 'Alert Conditions',
            content: 'Set up conditions like sentiment thresholds, volume spikes, or specific keywords.',
            placement: 'right'
          },
          {
            target: '[data-tour="notification-settings"]',
            title: 'Notification Preferences',
            content: 'Choose how you want to be notified: email, push notifications, or both.',
            placement: 'left'
          },
          {
            target: '[data-tour="alert-frequency"]',
            title: 'Alert Frequency',
            content: 'Control how often you receive alerts to avoid notification overload.',
            placement: 'top'
          }
        ]
      }
    ]
  }

  async getTours(): Promise<InteractiveTour[]> {
    return this.tours.filter(tour => tour.isActive)
  }

  async getTourById(id: string): Promise<InteractiveTour | null> {
    return this.tours.find(tour => tour.id === id && tour.isActive) || null
  }

  async getToursByContext(context: string): Promise<InteractiveTour[]> {
    // Map contexts to relevant tours
    const contextMap: Record<string, string[]> = {
      'dashboard': ['dashboard-tour'],
      'keywords': ['keyword-management-tour'],
      'search': ['search-tutorial'],
      'analytics': ['analytics-tour'],
      'alerts': ['alerts-setup-tour']
    }

    const tourIds = contextMap[context] || []
    return this.tours.filter(tour => tourIds.includes(tour.id) && tour.isActive)
  }

  async markTourCompleted(tourId: string, userId: string): Promise<void> {
    // In a real implementation, this would save to a database
    const completedTours = this.getCompletedTours(userId)
    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId)
      localStorage.setItem(`completedTours_${userId}`, JSON.stringify(completedTours))
    }
  }

  async isTourCompleted(tourId: string, userId: string): Promise<boolean> {
    const completedTours = this.getCompletedTours(userId)
    return completedTours.includes(tourId)
  }

  private getCompletedTours(userId: string): string[] {
    try {
      const stored = localStorage.getItem(`completedTours_${userId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  async resetTourProgress(userId: string): Promise<void> {
    localStorage.removeItem(`completedTours_${userId}`)
  }
}

export const tutorialService = TutorialService.getInstance()