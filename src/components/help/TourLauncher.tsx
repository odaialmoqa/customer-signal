'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, BookOpen, Clock, CheckCircle } from 'lucide-react'
import { InteractiveTour, useTour } from './InteractiveTour'
import { useTenant } from '@/lib/hooks/useTenant'

interface TourLauncherProps {
  context?: string
  className?: string
}

export function TourLauncher({ context, className }: TourLauncherProps) {
  const { availableTours, activeTour, startTour, stopTour } = useTour(context)
  const { user } = useTenant()
  const [completedTours, setCompletedTours] = useState<string[]>([])

  if (!user) return null

  const handleTourComplete = (tourId: string) => {
    setCompletedTours(prev => [...prev, tourId])
    stopTour()
  }

  const getDifficultyColor = (stepCount: number) => {
    if (stepCount <= 3) return 'bg-green-100 text-green-800'
    if (stepCount <= 5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getDifficultyLabel = (stepCount: number) => {
    if (stepCount <= 3) return 'Beginner'
    if (stepCount <= 5) return 'Intermediate'
    return 'Advanced'
  }

  if (availableTours.length === 0) {
    return null
  }

  return (
    <div className={className}>
      {/* Active Tour */}
      {activeTour && (
        <InteractiveTour
          tourId={activeTour}
          userId={user.id}
          onComplete={() => handleTourComplete(activeTour)}
          onSkip={stopTour}
        />
      )}

      {/* Tour Selection */}
      {!activeTour && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Interactive Tutorials</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Learn how to use CustomerSignal with step-by-step guided tours
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableTours.map(tour => {
              const isCompleted = completedTours.includes(tour.id)
              
              return (
                <div
                  key={tour.id}
                  className={`
                    border rounded-lg p-4 transition-colors
                    ${isCompleted ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {tour.name}
                        </h3>
                        {isCompleted && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {tour.description}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{tour.steps.length} steps</span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={getDifficultyColor(tour.steps.length)}
                        >
                          {getDifficultyLabel(tour.steps.length)}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-4">
                      {isCompleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startTour(tour.id)}
                        >
                          Replay
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startTour(tour.id)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}