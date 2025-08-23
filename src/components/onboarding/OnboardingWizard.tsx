'use client'

import { useState } from 'react'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Circle, ArrowRight, ArrowLeft, X } from 'lucide-react'
import { WelcomeStep } from './steps/WelcomeStep'
import { KeywordSetupStep } from './steps/KeywordSetupStep'
import { PlatformSelectionStep } from './steps/PlatformSelectionStep'
import { AlertSetupStep } from './steps/AlertSetupStep'
import { DashboardTourStep } from './steps/DashboardTourStep'

const stepComponents = {
  WelcomeStep,
  KeywordSetupStep,
  PlatformSelectionStep,
  AlertSetupStep,
  DashboardTourStep
}

interface OnboardingWizardProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const {
    progress,
    config,
    isLoading,
    error,
    completeStep,
    skipOnboarding,
    getCurrentStep,
    getCompletionPercentage,
    isStepCompleted
  } = useOnboarding()

  const [isSkipping, setIsSkipping] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-500 mb-2">Error loading onboarding</div>
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!progress || !config || progress.isCompleted) {
    return null
  }

  const currentStep = getCurrentStep()
  if (!currentStep) {
    return null
  }

  const StepComponent = stepComponents[currentStep.component as keyof typeof stepComponents]
  if (!StepComponent) {
    return (
      <div className="text-center text-red-500">
        Unknown step component: {currentStep.component}
      </div>
    )
  }

  const handleStepComplete = async () => {
    await completeStep(currentStep.id)
    
    // Check if this was the last step
    if (progress.currentStep >= config.steps.length - 1) {
      onComplete?.()
    }
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      await skipOnboarding()
      onSkip?.()
    } finally {
      setIsSkipping(false)
    }
  }

  const completionPercentage = getCompletionPercentage()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to CustomerSignal
          </h1>
          <p className="text-gray-600">
            Let's get you set up to monitor your brand across the internet
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {progress.currentStep + 1} of {config.steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {completionPercentage}% complete
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {config.steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index < progress.currentStep 
                      ? 'bg-green-500 text-white' 
                      : index === progress.currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {index < progress.currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 text-center max-w-16">
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < config.steps.length - 1 && (
                  <div className={`
                    w-8 h-0.5 mx-2
                    ${index < progress.currentStep ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentStep.title}</span>
              {config.skipEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isSkipping}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Skip Setup
                </Button>
              )}
            </CardTitle>
            <p className="text-gray-600">{currentStep.description}</p>
          </CardHeader>
          <CardContent>
            <StepComponent onComplete={handleStepComplete} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}