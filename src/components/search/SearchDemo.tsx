'use client'

import React from 'react'
import { SearchPage } from './SearchPage'

// Demo component to showcase the search functionality
export function SearchDemo() {
  const demoTenantId = 'demo-tenant'

  const handleConversationClick = (conversation: any) => {
    console.log('Clicked conversation:', conversation)
    // In a real app, this would navigate to a conversation detail page
    alert(`Viewing conversation: ${conversation.content.substring(0, 50)}...`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchPage 
        tenantId={demoTenantId}
        onConversationClick={handleConversationClick}
        initialFilters={{
          // Demo with some initial filters
          sentiments: ['positive'],
          platforms: ['reddit', 'twitter']
        }}
      />
    </div>
  )
}