import { createClient } from '@/lib/supabase/client'
import { OnboardingProgress, OnboardingStep, OnboardingConfig } from '@/lib/types/onboarding'

export class OnboardingService {
  private supabase = createClient()

  async getOnboardingProgress(userId: string, tenantId: string): Promise<OnboardingProgress | null> {
    const { data, error } = await this.supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get onboarding progress: ${error.message}`)
    }

    return data ? {
      userId: data.user_id,
      tenantId: data.tenant_id,
      currentStep: data.current_step,
      completedSteps: data.completed_steps || [],
      isCompleted: data.is_completed,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    } : null
  }

  async initializeOnboarding(userId: string, tenantId: string): Promise<OnboardingProgress> {
    const progress: Partial<OnboardingProgress> = {
      userId,
      tenantId,
      currentStep: 0,
      completedSteps: [],
      isCompleted: false,
      startedAt: new Date()
    }

    const { data, error } = await this.supabase
      .from('onboarding_progress')
      .insert({
        user_id: progress.userId,
        tenant_id: progress.tenantId,
        current_step: progress.currentStep,
        completed_steps: progress.completedSteps,
        is_completed: progress.isCompleted,
        started_at: progress.startedAt?.toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to initialize onboarding: ${error.message}`)
    }

    return {
      userId: data.user_id,
      tenantId: data.tenant_id,
      currentStep: data.current_step,
      completedSteps: data.completed_steps || [],
      isCompleted: data.is_completed,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    }
  }

  async completeStep(userId: string, tenantId: string, stepId: string): Promise<void> {
    const progress = await this.getOnboardingProgress(userId, tenantId)
    if (!progress) {
      throw new Error('Onboarding progress not found')
    }

    const updatedCompletedSteps = [...progress.completedSteps, stepId]
    const config = await this.getOnboardingConfig()
    const nextStep = progress.currentStep + 1
    const isCompleted = nextStep >= config.steps.length

    const { error } = await this.supabase
      .from('onboarding_progress')
      .update({
        current_step: nextStep,
        completed_steps: updatedCompletedSteps,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to complete step: ${error.message}`)
    }
  }

  async skipOnboarding(userId: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_progress')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to skip onboarding: ${error.message}`)
    }
  }

  async getOnboardingConfig(): Promise<OnboardingConfig> {
    // Default onboarding configuration
    return {
      skipEnabled: true,
      autoAdvance: false,
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to CustomerSignal',
          description: 'Get started with monitoring your brand across the internet',
          component: 'WelcomeStep',
          isCompleted: false,
          isRequired: true,
          order: 0
        },
        {
          id: 'keywords',
          title: 'Add Your First Keywords',
          description: 'Set up keywords to monitor for your brand and products',
          component: 'KeywordSetupStep',
          isCompleted: false,
          isRequired: true,
          order: 1
        },
        {
          id: 'platforms',
          title: 'Select Monitoring Platforms',
          description: 'Choose which platforms to monitor for conversations',
          component: 'PlatformSelectionStep',
          isCompleted: false,
          isRequired: true,
          order: 2
        },
        {
          id: 'alerts',
          title: 'Configure Alerts',
          description: 'Set up notifications for important mentions',
          component: 'AlertSetupStep',
          isCompleted: false,
          isRequired: false,
          order: 3
        },
        {
          id: 'dashboard',
          title: 'Explore Your Dashboard',
          description: 'Learn how to navigate and use your analytics dashboard',
          component: 'DashboardTourStep',
          isCompleted: false,
          isRequired: false,
          order: 4
        }
      ]
    }
  }

  async resetOnboarding(userId: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('onboarding_progress')
      .update({
        current_step: 0,
        completed_steps: [],
        is_completed: false,
        completed_at: null
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to reset onboarding: ${error.message}`)
    }
  }
}

export const onboardingService = new OnboardingService()