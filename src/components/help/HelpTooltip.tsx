'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HelpCircle, X } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'

interface HelpTooltipProps {
  title: string
  content: string
  children?: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click'
  size?: 'sm' | 'md' | 'lg'
}

export function HelpTooltip({ 
  title, 
  content, 
  children, 
  placement = 'top',
  trigger = 'hover',
  size = 'md'
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md'
  }

  if (trigger === 'click') {
    return (
      <div className="relative inline-block">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto"
          onClick={() => setIsOpen(!isOpen)}
        >
          {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
        </Button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <Card className={`absolute z-50 ${sizeClasses[size]} shadow-lg`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-900">{title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{content}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
          >
            {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={`
              bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg z-50
              ${sizeClasses[size]} leading-relaxed
            `}
            side={placement}
            sideOffset={5}
          >
            <div className="font-medium mb-1">{title}</div>
            <div>{content}</div>
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}