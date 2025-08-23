export interface OnboardingStep {
  id: string
  title: string
  description: string
  component: string
  isCompleted: boolean
  isRequired: boolean
  order: number
}

export interface OnboardingProgress {
  userId: string
  tenantId: string
  currentStep: number
  completedSteps: string[]
  isCompleted: boolean
  startedAt: Date
  completedAt?: Date
}

export interface OnboardingConfig {
  steps: OnboardingStep[]
  skipEnabled: boolean
  autoAdvance: boolean
}

export interface TourStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disableBeacon?: boolean
  spotlightClicks?: boolean
}

export interface InteractiveTour {
  id: string
  name: string
  description: string
  steps: TourStep[]
  isActive: boolean
  triggerCondition?: string
}