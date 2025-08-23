'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, ArrowLeft, ArrowRight, Play } from 'lucide-react'
import { InteractiveTour as TourType, TourStep } from '@/lib/types/onboarding'
import { tutorialService } from '@/lib/services/tutorial'

interface InteractiveTourProps {
  tourId: string
  userId: string
  onComplete?: () => void
  onSkip?: () => void
  autoStart?: boolean
}

export function InteractiveTour({ 
  tourId, 
  userId, 
  onComplete, 
  onSkip, 
  autoStart = false 
}: InteractiveTourProps) {
  const [tour, setTour] = useState<TourType | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null)

  useEffect(() => {
    loadTour()
  }, [tourId])

  useEffect(() => {
    if (autoStart && tour && !isCompleted) {
      startTour()
    }
  }, [tour, autoStart, isCompleted])

  const loadTour = async () => {
    try {
      const [tourData, completed] = await Promise.all([
        tutorialService.getTourById(tourId),
        tutorialService.isTourCompleted(tourId, userId)
      ])
      
      setTour(tourData)
      setIsCompleted(completed)
    } catch (error) {
      console.error('Failed to load tour:', error)
    }
  }

  const startTour = () => {
    if (!tour || isCompleted) return
    setIsActive(true)
    setCurrentStepIndex(0)
    showStep(0)
  }

  const showStep = (stepIndex: number) => {
    if (!tour || stepIndex >= tour.steps.length) return

    const step = tour.steps[stepIndex]
    const element = document.querySelector(step.target)
    
    if (element) {
      setHighlightedElement(element)
      
      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
      
      // Add highlight class
      element.classList.add('tour-highlight')
    }
  }

  const nextStep = () => {
    if (!tour) return
    
    if (currentStepIndex < tour.steps.length - 1) {
      const newIndex = currentStepIndex + 1
      setCurrentStepIndex(newIndex)
      showStep(newIndex)
    } else {
      completeTour()
    }
  }

  const previousStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1
      setCurrentStepIndex(newIndex)
      showStep(newIndex)
    }
  }

  const completeTour = async () => {
    try {
      await tutorialService.markTourCompleted(tourId, userId)
      setIsCompleted(true)
      setIsActive(false)
      cleanup()
      onComplete?.()
    } catch (error) {
      console.error('Failed to mark tour as completed:', error)
    }
  }

  const skipTour = () => {
    setIsActive(false)
    cleanup()
    onSkip?.()
  }

  const cleanup = () => {
    // Remove highlight from current element
    if (highlightedElement) {
      highlightedElement.classList.remove('tour-highlight')
      setHighlightedElement(null)
    }
    
    // Remove highlights from all elements
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
  }

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  if (!tour || isCompleted) {
    return null
  }

  if (!isActive) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Play className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-blue-900">{tour.name}</h3>
                <p className="text-sm text-blue-700">{tour.description}</p>
              </div>
            </div>
            <Button onClick={startTour} size="sm">
              Start Tour
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentStep = tour.steps[currentStepIndex]
  if (!currentStep) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour Step Card */}
      <div className="fixed z-50" style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <Card className="w-96 shadow-xl">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  Step {currentStepIndex + 1} of {tour.steps.length}
                </Badge>
                <h3 className="font-semibold text-gray-900">
                  {currentStep.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-gray-700 mb-6 leading-relaxed">
              {currentStep.content}
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(((currentStepIndex + 1) / tour.steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((currentStepIndex + 1) / tour.steps.length) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={previousStep}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                >
                  Skip Tour
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                >
                  {currentStepIndex === tour.steps.length - 1 ? 'Finish' : 'Next'}
                  {currentStepIndex < tour.steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spotlight effect for highlighted element */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5);
          border-radius: 4px;
        }
      `}</style>
    </>
  )
}

// Hook for managing tours
export function useTour(context?: string) {
  const [availableTours, setAvailableTours] = useState<TourType[]>([])
  const [activeTour, setActiveTour] = useState<string | null>(null)

  useEffect(() => {
    loadTours()
  }, [context])

  const loadTours = async () => {
    try {
      const tours = context 
        ? await tutorialService.getToursByContext(context)
        : await tutorialService.getTours()
      setAvailableTours(tours)
    } catch (error) {
      console.error('Failed to load tours:', error)
    }
  }

  const startTour = (tourId: string) => {
    setActiveTour(tourId)
  }

  const stopTour = () => {
    setActiveTour(null)
  }

  return {
    availableTours,
    activeTour,
    startTour,
    stopTour,
    refresh: loadTours
  }
}