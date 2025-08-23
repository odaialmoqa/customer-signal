'use client'

import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Alert {
  id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  created_at: string
  metadata?: {
    platform?: string
    sentiment?: string
    confidence?: number
    author?: string
    url?: string
  }
  conversation?: {
    platform: string
    author?: string
    url?: string
    content: string
  }
}

interface AlertListProps {
  alerts: Alert[]
  loading: boolean
  error: string | null
  onMarkAsRead: (alertId: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export function AlertList({ alerts, loading, error, onMarkAsRead, onRefresh }: AlertListProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'urgent'>('all')
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unread':
        return !alert.is_read
      case 'high':
        return alert.priority === 'high'
      case 'urgent':
        return alert.priority === 'urgent'
      default:
        return true
    }
  })

  const handleAlertClick = async (alert: Alert) => {
    if (!alert.is_read) {
      await onMarkAsRead(alert.id)
    }
    setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '🔴'
      case 'high':
        return '🟠'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😞'
      case 'neutral':
        return '😐'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unread', label: 'Unread' },
          { key: 'urgent', label: 'Urgent' },
          { key: 'high', label: 'High Priority' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alert Count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredAlerts.length} of {alerts.length} alerts
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {filter === 'all' ? 'No alerts yet' : `No ${filter} alerts`}
          </div>
          <p className="text-sm text-gray-400">
            {filter === 'all' 
              ? 'Alerts will appear here when your monitoring detects relevant conversations'
              : 'Try adjusting your filter or check back later'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg transition-all cursor-pointer hover:shadow-sm ${
                alert.is_read 
                  ? 'border-gray-200 bg-white' 
                  : 'border-blue-200 bg-blue-50'
              } ${expandedAlert === alert.id ? 'shadow-md' : ''}`}
              onClick={() => handleAlertClick(alert)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{getPriorityIcon(alert.priority)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                      {alert.metadata?.platform && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {alert.metadata.platform}
                        </span>
                      )}
                      {alert.metadata?.sentiment && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <span>{getSentimentIcon(alert.metadata.sentiment)}</span>
                          <span>{alert.metadata.sentiment}</span>
                          {alert.metadata.confidence && (
                            <span>({Math.round(alert.metadata.confidence * 100)}%)</span>
                          )}
                        </span>
                      )}
                      {!alert.is_read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    
                    <h3 className={`font-medium mb-2 ${
                      alert.is_read ? 'text-gray-900' : 'text-gray-900 font-semibold'
                    }`}>
                      {alert.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                        {alert.metadata?.author && (
                          <span>by {alert.metadata.author}</span>
                        )}
                      </div>
                      {alert.metadata?.url && (
                        <a
                          href={alert.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Source →
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        expandedAlert === alert.id
                          ? 'text-blue-700 bg-blue-100'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {expandedAlert === alert.id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedAlert === alert.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {alert.conversation && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Original Conversation</h4>
                          {alert.conversation.url && (
                            <a
                              href={alert.conversation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Original →
                            </a>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-3">
                          {alert.conversation.content}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Platform: {alert.conversation.platform}</span>
                          {alert.conversation.author && (
                            <span>Author: {alert.conversation.author}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Alert Details</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}