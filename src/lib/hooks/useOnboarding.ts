import { useState, useEffect } from 'react'
import { onboardingService } from '@/lib/services/onboarding'
import { OnboardingProgress, OnboardingConfig } from '@/lib/types/onboarding'
import { useTenant } from './useTenant'

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [config, setConfig] = useState<OnboardingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentTenant, user } = useTenant()

  useEffect(() => {
    if (user && currentTenant) {
      loadOnboardingData()
    }
  }, [user, currentTenant])

  const loadOnboardingData = async () => {
    if (!user || !currentTenant) return

    try {
      setIsLoading(true)
      setError(null)

      const [progressData, configData] = await Promise.all([
        onboardingService.getOnboardingProgress(user.id, currentTenant.id),
        onboardingService.getOnboardingConfig()
      ])

      if (!progressData) {
        // Initialize onboarding if not started
        const newProgress = await onboardingService.initializeOnboarding(user.id, currentTenant.id)
        setProgress(newProgress)
      } else {
        setProgress(progressData)
      }

      setConfig(configData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding data')
    } finally {
      setIsLoading(false)
    }
  }

  const completeStep = async (stepId: string) => {
    if (!user || !currentTenant) return

    try {
      await onboardingService.completeStep(user.id, currentTenant.id, stepId)
      await loadOnboardingData() // Refresh progress
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete step')
    }
  }

  const skipOnboarding = async () => {
    if (!user || !currentTenant) return

    try {
      await onboardingService.skipOnboarding(user.id, currentTenant.id)
      await loadOnboardingData() // Refresh progress
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip onboarding')
    }
  }

  const resetOnboarding = async () => {
    if (!user || !currentTenant) return

    try {
      await onboardingService.resetOnboarding(user.id, currentTenant.id)
      await loadOnboardingData() // Refresh progress
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset onboarding')
    }
  }

  const getCurrentStep = () => {
    if (!progress || !config) return null
    return config.steps[progress.currentStep] || null
  }

  const getCompletionPercentage = () => {
    if (!progress || !config) return 0
    return Math.round((progress.completedSteps.length / config.steps.length) * 100)
  }

  const isStepCompleted = (stepId: string) => {
    return progress?.completedSteps.includes(stepId) || false
  }

  return {
    progress,
    config,
    isLoading,
    error,
    completeStep,
    skipOnboarding,
    resetOnboarding,
    getCurrentStep,
    getCompletionPercentage,
    isStepCompleted,
    refresh: loadOnboardingData
  }
}