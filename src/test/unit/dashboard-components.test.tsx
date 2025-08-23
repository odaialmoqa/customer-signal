import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ConversationFeed from '@/components/dashboard/ConversationFeed'
import QuickActions from '@/components/dashboard/QuickActions'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the hooks
vi.mock('@/lib/hooks/useTenant', () => ({
  useTenant: vi.fn()
}))

vi.mock('@/lib/hooks/useConversations', () => ({
  useConversations: vi.fn()
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }))
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard')
}))

const mockTenant = {
  id: 'tenant-1',
  name: 'Test Company',
  subscription: 'pro' as const,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'admin',
  avatar_url: null,
  preferences: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('Dashboard Components', () => {
  beforeEach(() => {
    const { useTenant } = require('@/lib/hooks/useTenant')
    const { useConversations } = require('@/lib/hooks/useConversations')
    
    useTenant.mockReturnValue({
      tenant: mockTenant,
      profile: mockProfile,
      loading: false
    })

    useConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      totalCount: 0,
      searchConversations: vi.fn(),
      createConversation: vi.fn(),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      addTags: vi.fn(),
      removeTags: vi.fn(),
      refresh: vi.fn()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('DashboardLayout', () => {
    it('renders the layout with navigation', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('CustomerSignal')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  describe('ConversationFeed', () => {
    it('shows empty state when no conversations', () => {
      render(<ConversationFeed />)
      expect(screen.getByText('No conversations found')).toBeInTheDocument()
    })
  })

  describe('QuickActions', () => {
    it('renders all quick action cards', () => {
      render(<QuickActions />)
      expect(screen.getByText('Add Keywords')).toBeInTheDocument()
      expect(screen.getByText('Search Conversations')).toBeInTheDocument()
    })
  })
})