'use client'

import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default function SetupPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/dashboard')
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <OnboardingWizard 
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  )
}