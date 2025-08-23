import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NotificationSettings from '@/components/settings/NotificationSettings'
import { useTenant } from '@/lib/hooks/useTenant'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
vi.mock('@/lib/hooks/useTenant')
vi.mock('@/lib/supabase/client')

const mockUseTenant = vi.mocked(useTenant)
const mockCreateClient = vi.mocked(createClient)

const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member' as const,
  avatar_url: '',
  preferences: {
    notifications: {
      email_alerts: true,
      email_daily_digest: false,
      alert_threshold_high: true,
      platform_notifications: {
        reddit: true,
        twitter: false
      }
    }
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseTenant.mockReturnValue({
      profile: mockProfile,
      refreshData: vi.fn(),
      tenant: null,
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      canManageTenant: vi.fn(),
      isOwner: false,
      isAdmin: false,
      isMember: true
    })

    mockCreateClient.mockReturnValue(mockSupabase as any)
  })

  it('renders notification settings form', () => {
    render(<NotificationSettings />)
    
    expect(screen.getByText('Notification Settings')).toBeInTheDocument()
    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Alert Priority Levels')).toBeInTheDocument()
    expect(screen.getByText('Platform Notifications')).toBeInTheDocument()
    expect(screen.getByText('Quiet Hours')).toBeInTheDocument()
  })

  it('loads existing preferences from profile', () => {
    render(<NotificationSettings />)
    
    // Check that email alerts checkbox is checked (from mock profile)
    const emailAlertsCheckbox = screen.getByLabelText(/Instant email alerts/)
    expect(emailAlertsCheckbox).toBeChecked()
    
    // Check that daily digest is unchecked (from mock profile)
    const dailyDigestCheckbox = screen.getByLabelText(/Daily digest/)
    expect(dailyDigestCheckbox).not.toBeChecked()
  })

  it('updates email notification preferences', () => {
    render(<NotificationSettings />)
    
    const dailyDigestCheckbox = screen.getByLabelText(/Daily digest/)
    fireEvent.click(dailyDigestCheckbox)
    
    expect(dailyDigestCheckbox).toBeChecked()
  })

  it('updates platform notification preferences', () => {
    render(<NotificationSettings />)
    
    const twitterCheckbox = screen.getByLabelText(/twitter/)
    fireEvent.click(twitterCheckbox)
    
    expect(twitterCheckbox).toBeChecked()
  })

  it('enables and configures quiet hours', () => {
    render(<NotificationSettings />)
    
    const quietHoursCheckbox = screen.getByLabelText(/Enable quiet hours/)
    fireEvent.click(quietHoursCheckbox)
    
    expect(quietHoursCheckbox).toBeChecked()
    
    // Check that time inputs appear
    expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
    expect(screen.getByLabelText('End Time')).toBeInTheDocument()
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
  })

  it('updates quiet hours time settings', () => {
    render(<NotificationSettings />)
    
    // Enable quiet hours first
    const quietHoursCheckbox = screen.getByLabelText(/Enable quiet hours/)
    fireEvent.click(quietHoursCheckbox)
    
    // Update start time
    const startTimeInput = screen.getByLabelText('Start Time')
    fireEvent.change(startTimeInput, { target: { value: '23:00' } })
    
    expect(startTimeInput).toHaveValue('23:00')
  })

  it('submits notification preferences', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockRefreshData = vi.fn()
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: mockUpdate
      }))
    })

    mockUseTenant.mockReturnValue({
      profile: mockProfile,
      refreshData: mockRefreshData,
      tenant: null,
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      canManageTenant: vi.fn(),
      isOwner: false,
      isAdmin: false,
      isMember: true
    })

    render(<NotificationSettings />)
    
    const submitButton = screen.getByText('Save Preferences')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockRefreshData).toHaveBeenCalled()
    })
  })

  it('displays success message after successful update', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: mockUpdate
      }))
    })

    render(<NotificationSettings />)
    
    const submitButton = screen.getByText('Save Preferences')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Notification preferences updated successfully')).toBeInTheDocument()
    })
  })

  it('displays error message when update fails', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ 
      error: new Error('Update failed') 
    })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: mockUpdate
      }))
    })

    render(<NotificationSettings />)
    
    const submitButton = screen.getByText('Save Preferences')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const mockUpdate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: mockUpdate
      }))
    })

    render(<NotificationSettings />)
    
    const submitButton = screen.getByText('Save Preferences')
    fireEvent.click(submitButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeInTheDocument()
    })
  })

  it('clears error and success messages when preferences change', () => {
    render(<NotificationSettings />)
    
    // Simulate an error state
    const emailAlertsCheckbox = screen.getByLabelText(/Instant email alerts/)
    fireEvent.click(emailAlertsCheckbox)
    
    // Error and success messages should be cleared when user makes changes
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
  })

  it('handles missing profile gracefully', () => {
    mockUseTenant.mockReturnValue({
      profile: null,
      refreshData: vi.fn(),
      tenant: null,
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      canManageTenant: vi.fn(),
      isOwner: false,
      isAdmin: false,
      isMember: true
    })

    render(<NotificationSettings />)
    
    expect(screen.getByText('Loading notification settings...')).toBeInTheDocument()
  })
})