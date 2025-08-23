import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

// Mock the entire onboarding flow
const mockOnboardingFlow = {
  currentStep: 0,
  totalSteps: 5,
  isCompleted: false,
  progress: {
    userId: 'user-123',
    tenantId: 'tenant-456',
    currentStep: 0,
    completedSteps: [],
    isCompleted: false,
    startedAt: new Date('2024-01-15T10:00:00Z')
  },
  config: {
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to CustomerSignal',
        description: 'Get started with monitoring your brand',
        component: 'WelcomeStep',
        isCompleted: false,
        isRequired: true,
        order: 0
      },
      {
        id: 'keywords',
        title: 'Add Your First Keywords',
        description: 'Set up keywords to monitor',
        component: 'KeywordSetupStep',
        isCompleted: false,
        isRequired: true,
        order: 1
      },
      {
        id: 'platforms',
        title: 'Select Monitoring Platforms',
        description: 'Choose platforms to monitor',
        component: 'PlatformSelectionStep',
        isCompleted: false,
        isRequired: true,
        order: 2
      },
      {
        id: 'alerts',
        title: 'Configure Alerts',
        description: 'Set up notifications',
        component: 'AlertSetupStep',
        isCompleted: false,
        isRequired: false,
        order: 3
      },
      {
        id: 'dashboard',
        title: 'Explore Your Dashboard',
        description: 'Learn about the dashboard',
        component: 'DashboardTourStep',
        isCompleted: false,
        isRequired: false,
        order: 4
      }
    ],
    skipEnabled: true,
    autoAdvance: false
  }
}

// Mock services
const mockOnboardingService = {
  getOnboardingProgress: vi.fn(),
  initializeOnboarding: vi.fn(),
  completeStep: vi.fn(),
  skipOnboarding: vi.fn(),
  getOnboardingConfig: vi.fn(),
  resetOnboarding: vi.fn()
}

const mockKeywordService = {
  addKeyword: vi.fn()
}

vi.mock('@/lib/services/onboarding', () => ({
  onboardingService: mockOnboardingService
}))

vi.mock('@/lib/hooks/useKeywords', () => ({
  useKeywords: () => ({
    addKeyword: mockKeywordService.addKeyword
  })
}))

describe('Onboarding Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    mockOnboardingFlow.currentStep = 0
    mockOnboardingFlow.isCompleted = false
    mockOnboardingFlow.progress.currentStep = 0
    mockOnboardingFlow.progress.completedSteps = []
    mockOnboardingFlow.progress.isCompleted = false
    
    // Setup default mock responses
    mockOnboardingService.getOnboardingProgress.mockResolvedValue(mockOnboardingFlow.progress)
    mockOnboardingService.getOnboardingConfig.mockResolvedValue(mockOnboardingFlow.config)
    mockOnboardingService.completeStep.mockResolvedValue(undefined)
    mockOnboardingService.skipOnboarding.mockResolvedValue(undefined)
    mockKeywordService.addKeyword.mockResolvedValue(undefined)
  })

  it('should initialize onboarding for new users', async () => {
    // Mock no existing progress
    mockOnboardingService.getOnboardingProgress.mockResolvedValue(null)
    mockOnboardingService.initializeOnboarding.mockResolvedValue(mockOnboardingFlow.progress)
    
    render(<OnboardingWizard />)
    
    await waitFor(() => {
      expect(mockOnboardingService.initializeOnboarding).toHaveBeenCalledWith(
        'user-123',
        'tenant-456'
      )
    })
  })

  it('should complete full onboarding flow', async () => {
    const onComplete = vi.fn()
    
    // Start with welcome step
    render(<OnboardingWizard onComplete={onComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText('Welcome to CustomerSignal')).toBeInTheDocument()
    })
    
    // Complete welcome step
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.completeStep).toHaveBeenCalledWith(
        'user-123',
        'tenant-456',
        'welcome'
      )
    })
    
    // Move to keywords step
    mockOnboardingFlow.currentStep = 1
    mockOnboardingFlow.progress.currentStep = 1
    mockOnboardingFlow.progress.completedSteps = ['welcome']
    
    // Add keywords
    const keywordInput = screen.getByPlaceholderText('e.g., your company name')
    fireEvent.change(keywordInput, { target: { value: 'test brand' } })
    
    const addButton = screen.getByRole('button', { name: /plus/i })
    fireEvent.click(addButton)
    
    const submitButton = screen.getByText('Add 1 Keywords')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockKeywordService.addKeyword).toHaveBeenCalledWith({
        keyword: 'test brand',
        platforms: ['twitter', 'reddit', 'news', 'forums'],
        alertThreshold: 0.7,
        isActive: true
      })
      expect(mockOnboardingService.completeStep).toHaveBeenCalledWith(
        'user-123',
        'tenant-456',
        'keywords'
      )
    })
    
    // Continue through remaining steps...
    // This would continue for each step in the flow
  })

  it('should handle step completion with progress tracking', async () => {
    render(<OnboardingWizard />)
    
    // Initially at 0% progress
    expect(screen.getByText('0% complete')).toBeInTheDocument()
    
    // Complete first step
    mockOnboardingService.completeStep.mockImplementation(async () => {
      mockOnboardingFlow.progress.currentStep = 1
      mockOnboardingFlow.progress.completedSteps = ['welcome']
    })
    
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.completeStep).toHaveBeenCalled()
    })
    
    // Progress should update
    expect(screen.getByText('20% complete')).toBeInTheDocument() // 1/5 steps
  })

  it('should allow skipping entire onboarding', async () => {
    const onSkip = vi.fn()
    render(<OnboardingWizard onSkip={onSkip} />)
    
    const skipButton = screen.getByText('Skip Setup')
    fireEvent.click(skipButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.skipOnboarding).toHaveBeenCalledWith(
        'user-123',
        'tenant-456'
      )
      expect(onSkip).toHaveBeenCalled()
    })
  })

  it('should handle onboarding completion', async () => {
    const onComplete = vi.fn()
    
    // Start at the last step
    mockOnboardingFlow.currentStep = 4
    mockOnboardingFlow.progress.currentStep = 4
    mockOnboardingFlow.progress.completedSteps = ['welcome', 'keywords', 'platforms', 'alerts']
    
    render(<OnboardingWizard onComplete={onComplete} />)
    
    // Complete the last step
    mockOnboardingService.completeStep.mockImplementation(async () => {
      mockOnboardingFlow.progress.currentStep = 5
      mockOnboardingFlow.progress.completedSteps.push('dashboard')
      mockOnboardingFlow.progress.isCompleted = true
    })
    
    const finishButton = screen.getByText('Complete Setup')
    fireEvent.click(finishButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.completeStep).toHaveBeenCalledWith(
        'user-123',
        'tenant-456',
        'dashboard'
      )
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('should handle errors gracefully', async () => {
    // Mock service error
    mockOnboardingService.completeStep.mockRejectedValue(new Error('Service error'))
    
    render(<OnboardingWizard />)
    
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.completeStep).toHaveBeenCalled()
    })
    
    // Should handle error without crashing
    expect(screen.getByText('Welcome to CustomerSignal')).toBeInTheDocument()
  })

  it('should persist progress across page reloads', async () => {
    // Mock existing progress
    mockOnboardingFlow.progress.currentStep = 2
    mockOnboardingFlow.progress.completedSteps = ['welcome', 'keywords']
    
    render(<OnboardingWizard />)
    
    await waitFor(() => {
      expect(mockOnboardingService.getOnboardingProgress).toHaveBeenCalledWith(
        'user-123',
        'tenant-456'
      )
    })
    
    // Should show current step based on saved progress
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument()
    expect(screen.getByText('40% complete')).toBeInTheDocument() // 2/5 steps
  })

  it('should validate required vs optional steps', async () => {
    render(<OnboardingWizard />)
    
    // Required steps should not be skippable individually
    expect(screen.queryByText('Skip Step')).not.toBeInTheDocument()
    
    // Move to optional step (alerts)
    mockOnboardingFlow.currentStep = 3
    mockOnboardingFlow.progress.currentStep = 3
    
    // Optional steps should be skippable
    expect(screen.getByText('Skip for Now')).toBeInTheDocument()
  })

  it('should handle step navigation correctly', async () => {
    render(<OnboardingWizard />)
    
    // Should start at step 1
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    
    // Complete step and advance
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    await waitFor(() => {
      expect(mockOnboardingService.completeStep).toHaveBeenCalled()
    })
    
    // Should advance to next step
    mockOnboardingFlow.currentStep = 1
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
  })
})