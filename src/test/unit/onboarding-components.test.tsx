import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep'
import { KeywordSetupStep } from '@/components/onboarding/steps/KeywordSetupStep'

// Mock hooks
const mockUseOnboarding = {
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
      }
    ],
    skipEnabled: true,
    autoAdvance: false
  },
  isLoading: false,
  error: null,
  completeStep: vi.fn(),
  skipOnboarding: vi.fn(),
  getCurrentStep: vi.fn(),
  getCompletionPercentage: vi.fn(() => 0),
  isStepCompleted: vi.fn(() => false)
}

const mockUseKeywords = {
  addKeyword: vi.fn()
}

vi.mock('@/lib/hooks/useOnboarding', () => ({
  useOnboarding: () => mockUseOnboarding
}))

vi.mock('@/lib/hooks/useKeywords', () => ({
  useKeywords: () => mockUseKeywords
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} {...props} />
  )
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}))

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOnboarding.getCurrentStep.mockReturnValue(mockUseOnboarding.config.steps[0])
  })

  it('should render loading state', () => {
    mockUseOnboarding.isLoading = true
    render(<OnboardingWizard />)
    
    expect(screen.getByRole('generic')).toHaveClass('animate-spin')
  })

  it('should render error state', () => {
    mockUseOnboarding.isLoading = false
    mockUseOnboarding.error = 'Failed to load onboarding'
    
    render(<OnboardingWizard />)
    
    expect(screen.getByText('Error loading onboarding')).toBeInTheDocument()
    expect(screen.getByText('Failed to load onboarding')).toBeInTheDocument()
  })

  it('should not render when onboarding is completed', () => {
    mockUseOnboarding.isLoading = false
    mockUseOnboarding.error = null
    mockUseOnboarding.progress!.isCompleted = true
    
    const { container } = render(<OnboardingWizard />)
    
    expect(container.firstChild).toBeNull()
  })

  it('should render onboarding wizard with current step', () => {
    mockUseOnboarding.isLoading = false
    mockUseOnboarding.error = null
    mockUseOnboarding.progress!.isCompleted = false
    
    render(<OnboardingWizard />)
    
    expect(screen.getByText('Welcome to CustomerSignal')).toBeInTheDocument()
    expect(screen.getByText('Let\'s get you set up to monitor your brand across the internet')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('should show progress bar with correct percentage', () => {
    mockUseOnboarding.getCompletionPercentage.mockReturnValue(25)
    
    render(<OnboardingWizard />)
    
    const progress = screen.getByTestId('progress')
    expect(progress).toHaveAttribute('data-value', '25')
    expect(screen.getByText('25% complete')).toBeInTheDocument()
  })

  it('should handle step completion', async () => {
    render(<OnboardingWizard />)
    
    // This would be triggered by the step component
    await waitFor(() => {
      expect(mockUseOnboarding.completeStep).toHaveBeenCalledWith('welcome')
    })
  })

  it('should handle skip onboarding', async () => {
    render(<OnboardingWizard />)
    
    const skipButton = screen.getByText('Skip Setup')
    fireEvent.click(skipButton)
    
    await waitFor(() => {
      expect(mockUseOnboarding.skipOnboarding).toHaveBeenCalled()
    })
  })

  it('should call onComplete when onboarding is finished', async () => {
    const onComplete = vi.fn()
    mockUseOnboarding.progress!.currentStep = 1 // Last step
    
    render(<OnboardingWizard onComplete={onComplete} />)
    
    // Simulate completing the last step
    await mockUseOnboarding.completeStep('keywords')
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})

describe('WelcomeStep', () => {
  it('should render welcome content', () => {
    const onComplete = vi.fn()
    render(<WelcomeStep onComplete={onComplete} />)
    
    expect(screen.getByText('Monitor Your Brand Across the Internet')).toBeInTheDocument()
    expect(screen.getByText('Comprehensive Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument()
    expect(screen.getByText('Real-time Alerts')).toBeInTheDocument()
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
  })

  it('should call onComplete when Get Started is clicked', () => {
    const onComplete = vi.fn()
    render(<WelcomeStep onComplete={onComplete} />)
    
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    expect(onComplete).toHaveBeenCalled()
  })
})

describe('KeywordSetupStep', () => {
  beforeEach(() => {
    mockUseKeywords.addKeyword.mockResolvedValue(undefined)
  })

  it('should render keyword setup form', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    expect(screen.getByText('Add Keywords to Monitor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., your company name')).toBeInTheDocument()
    expect(screen.getByText('Keyword Suggestions')).toBeInTheDocument()
  })

  it('should add keywords to the list', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const input = screen.getByPlaceholderText('e.g., your company name')
    const addButton = screen.getByRole('button', { name: /plus/i })
    
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.click(addButton)
    
    expect(screen.getByText('test keyword')).toBeInTheDocument()
    expect(screen.getByText('Keywords to monitor (1)')).toBeInTheDocument()
  })

  it('should add keyword on Enter key press', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const input = screen.getByPlaceholderText('e.g., your company name')
    
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' })
    
    expect(screen.getByText('test keyword')).toBeInTheDocument()
  })

  it('should remove keywords from the list', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const input = screen.getByPlaceholderText('e.g., your company name')
    const addButton = screen.getByRole('button', { name: /plus/i })
    
    // Add keyword
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.click(addButton)
    
    // Remove keyword
    const removeButton = screen.getByRole('button', { name: /x/i })
    fireEvent.click(removeButton)
    
    expect(screen.queryByText('test keyword')).not.toBeInTheDocument()
  })

  it('should prevent duplicate keywords', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const input = screen.getByPlaceholderText('e.g., your company name')
    const addButton = screen.getByRole('button', { name: /plus/i })
    
    // Add keyword twice
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.click(addButton)
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.click(addButton)
    
    // Should only appear once
    const keywords = screen.getAllByText('test keyword')
    expect(keywords).toHaveLength(1)
  })

  it('should submit keywords and complete step', async () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const input = screen.getByPlaceholderText('e.g., your company name')
    const addButton = screen.getByRole('button', { name: /plus/i })
    
    // Add keyword
    fireEvent.change(input, { target: { value: 'test keyword' } })
    fireEvent.click(addButton)
    
    // Submit
    const submitButton = screen.getByText('Add 1 Keywords')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockUseKeywords.addKeyword).toHaveBeenCalledWith({
        keyword: 'test keyword',
        platforms: ['twitter', 'reddit', 'news', 'forums'],
        alertThreshold: 0.7,
        isActive: true
      })
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('should allow skipping keyword setup', () => {
    const onComplete = vi.fn()
    render(<KeywordSetupStep onComplete={onComplete} />)
    
    const skipButton = screen.getByText('Skip for Now')
    fireEvent.click(skipButton)
    
    expect(onComplete).toHaveBeenCalled()
  })
})