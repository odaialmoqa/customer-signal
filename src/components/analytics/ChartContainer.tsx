'use client'

import React from 'react'
import { ArrowsPointingOutIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ChartContainerProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  fullWidth?: boolean
  onExpand?: () => void
}

export function ChartContainer({
  title,
  subtitle,
  icon,
  children,
  loading = false,
  error = null,
  fullWidth = false,
  onExpand
}: ChartContainerProps) {
  return (
    <div className={`bg-white shadow rounded-lg ${fullWidth ? 'col-span-full' : ''}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 text-gray-400">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {loading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {onExpand && !loading && (
              <button
                onClick={onExpand}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                title="Expand chart"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-600 mb-2">Error loading chart</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}