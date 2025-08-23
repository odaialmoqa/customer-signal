import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UserProfileSettings from '@/components/settings/UserProfileSettings'
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
  avatar_url: 'https://example.com/avatar.jpg',
  preferences: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  })),
  auth: {
    updateUser: vi.fn()
  }
}

describe('UserProfileSettings', () => {
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

  it('renders profile settings form', () => {
    render(<UserProfileSettings />)
    
    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/avatar.jpg')).toBeInTheDocument()
  })

  it('displays user avatar when avatar_url is provided', () => {
    render(<UserProfileSettings />)
    
    const avatar = screen.getByAltText('Profile')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('displays initials when no avatar_url is provided', () => {
    mockUseTenant.mockReturnValue({
      profile: { ...mockProfile, avatar_url: '' },
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

    render(<UserProfileSettings />)
    
    expect(screen.getByText('T')).toBeInTheDocument() // First letter of "Test User"
  })

  it('updates form fields when user types', () => {
    render(<UserProfileSettings />)
    
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
    
    expect(nameInput).toHaveValue('Updated Name')
  })

  it('submits form with updated profile data', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { ...mockProfile, full_name: 'Updated Name' },
      error: null
    })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })

    const mockRefreshData = vi.fn()
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

    render(<UserProfileSettings />)
    
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockRefreshData).toHaveBeenCalled()
    })
  })

  it('handles email update by calling auth.updateUser', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { ...mockProfile, email: 'newemail@example.com' },
      error: null
    })
    
    const mockAuthUpdate = vi.fn().mockResolvedValue({ error: null })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })
    
    mockSupabase.auth.updateUser = mockAuthUpdate

    render(<UserProfileSettings />)
    
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } })
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAuthUpdate).toHaveBeenCalledWith({
        email: 'newemail@example.com'
      })
    })
  })

  it('displays error message when update fails', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Update failed')
    })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })

    render(<UserProfileSettings />)
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('displays success message when update succeeds', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: mockProfile,
      error: null
    })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })

    render(<UserProfileSettings />)
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument()
    })
  })

  it('shows loading state during form submission', async () => {
    const mockUpdate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: mockProfile, error: null }), 100))
    )
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })

    render(<UserProfileSettings />)
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })
  })

  it('calls onProfileUpdate callback when provided', async () => {
    const mockOnProfileUpdate = vi.fn()
    const updatedProfile = { ...mockProfile, full_name: 'Updated Name' }
    
    const mockUpdate = vi.fn().mockResolvedValue({
      data: updatedProfile,
      error: null
    })
    
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate
          }))
        }))
      }))
    })

    render(<UserProfileSettings onProfileUpdate={mockOnProfileUpdate} />)
    
    const submitButton = screen.getByText('Save Changes')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnProfileUpdate).toHaveBeenCalledWith(updatedProfile)
    })
  })
})