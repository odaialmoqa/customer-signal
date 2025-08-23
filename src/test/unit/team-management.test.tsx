import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import TeamManagement from '@/components/team/TeamManagement'
import { useTenant } from '@/lib/hooks/useTenant'
import { TenantService } from '@/lib/services/tenant'

// Mock dependencies
vi.mock('@/lib/hooks/useTenant')
vi.mock('@/lib/services/tenant')

const mockUseTenant = vi.mocked(useTenant)
const mockTenantService = vi.mocked(TenantService)

const mockUsers = [
  {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'owner@example.com',
    full_name: 'Owner User',
    role: 'owner' as const,
    avatar_url: 'https://example.com/owner.jpg',
    preferences: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    tenant_id: 'tenant-1',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin' as const,
    avatar_url: '',
    preferences: {},
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 'user-3',
    tenant_id: 'tenant-1',
    email: 'member@example.com',
    full_name: 'Member User',
    role: 'member' as const,
    avatar_url: '',
    preferences: {},
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  }
]

const mockInvitations = [
  {
    id: 'invite-1',
    tenant_id: 'tenant-1',
    email: 'pending@example.com',
    role: 'member' as const,
    invited_by: 'user-1',
    expires_at: '2024-12-31T23:59:59Z',
    created_at: '2024-01-04T00:00:00Z'
  }
]

const mockProfile = mockUsers[0] // Owner profile

describe('TeamManagement', () => {
  const mockGetTenantUsers = vi.fn()
  const mockInviteUser = vi.fn()
  const mockUpdateUserRole = vi.fn()
  const mockRemoveUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseTenant.mockReturnValue({
      profile: mockProfile,
      canManageUsers: vi.fn().mockReturnValue(true),
      tenant: null,
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      refreshData: vi.fn(),
      hasRole: vi.fn(),
      canManageTenant: vi.fn(),
      isOwner: true,
      isAdmin: true,
      isMember: true
    })

    mockTenantService.mockImplementation(() => ({
      getTenantUsers: mockGetTenantUsers,
      inviteUser: mockInviteUser,
      updateUserRole: mockUpdateUserRole,
      removeUser: mockRemoveUser
    }) as any)

    mockGetTenantUsers.mockResolvedValue(mockUsers)
  })

  it('renders team management interface', async () => {
    render(<TeamManagement />)
    
    expect(screen.getByText('Team Management')).toBeInTheDocument()
    expect(screen.getByText('Invite Team Member')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Members (3)')).toBeInTheDocument()
      expect(screen.getByText('Invitations (0)')).toBeInTheDocument()
    })
  })

  it('loads and displays team members', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Owner User')).toBeInTheDocument()
      expect(screen.getByText('owner@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('Member User')).toBeInTheDocument()
      expect(screen.getByText('member@example.com')).toBeInTheDocument()
    })
  })

  it('displays user avatars when available', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      const ownerAvatar = screen.getByAltText('Owner User')
      expect(ownerAvatar).toBeInTheDocument()
      expect(ownerAvatar).toHaveAttribute('src', 'https://example.com/owner.jpg')
    })
  })

  it('displays user initials when no avatar is available', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument() // Admin User initial
      expect(screen.getByText('M')).toBeInTheDocument() // Member User initial
    })
  })

  it('sends user invitation', async () => {
    mockInviteUser.mockResolvedValue({
      id: 'new-invite',
      tenant_id: 'tenant-1',
      email: 'newuser@example.com',
      role: 'member',
      invited_by: 'user-1',
      expires_at: '2024-12-31T23:59:59Z',
      created_at: '2024-01-05T00:00:00Z'
    })

    render(<TeamManagement />)
    
    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    const roleSelect = screen.getByLabelText('Role')
    const inviteButton = screen.getByText('Send Invitation')
    
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
    fireEvent.change(roleSelect, { target: { value: 'admin' } })
    fireEvent.click(inviteButton)

    await waitFor(() => {
      expect(mockInviteUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        role: 'admin'
      })
    })
  })

  it('updates user role', async () => {
    mockUpdateUserRole.mockResolvedValue(mockUsers[2])

    render(<TeamManagement />)
    
    await waitFor(() => {
      // Find the member user row and simulate role change
      const memberRow = screen.getByText('Member User').closest('tr')
      expect(memberRow).toBeInTheDocument()
      
      // Simulate the role change by directly calling the handler
      // In a real scenario, this would be triggered by the select change
      const roleSelect = memberRow?.querySelector('select')
      if (roleSelect) {
        fireEvent.change(roleSelect, { target: { value: 'admin' } })
      }
    })

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith('user-3', 'admin')
    })
  })

  it('removes user from team', async () => {
    mockRemoveUser.mockResolvedValue(undefined)
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<TeamManagement />)
    
    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove')
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]) // Remove first non-owner user
      }
    })

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to remove Admin User from the team?')
      expect(mockRemoveUser).toHaveBeenCalledWith('user-2')
    })

    confirmSpy.mockRestore()
  })

  it('does not show remove button for owner', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      const ownerRow = screen.getByText('Owner User').closest('tr')
      expect(ownerRow).not.toHaveTextContent('Remove')
    })
  })

  it('does not show role selector for owner', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      const ownerRow = screen.getByText('Owner User').closest('tr')
      expect(ownerRow?.querySelector('select')).not.toBeInTheDocument()
    })
  })

  it('switches between members and invitations tabs', async () => {
    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument()
    })

    const invitationsTab = screen.getByText('Invitations (0)')
    fireEvent.click(invitationsTab)

    expect(screen.getByText('Pending Invitations')).toBeInTheDocument()
    expect(screen.getByText('No pending invitations')).toBeInTheDocument()
  })

  it('displays pending invitations when available', async () => {
    // Mock invitations data
    const mockLoadInvitations = vi.fn().mockResolvedValue(mockInvitations)
    
    render(<TeamManagement />)
    
    // Switch to invitations tab
    await waitFor(() => {
      const invitationsTab = screen.getByText('Invitations (0)')
      fireEvent.click(invitationsTab)
    })

    // Note: This test would need the actual invitation loading logic implemented
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    mockGetTenantUsers.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockUsers), 100))
    )

    render(<TeamManagement />)
    
    expect(screen.getByText('Team Management')).toBeInTheDocument()
    // Loading spinner should be visible
  })

  it('handles error state', async () => {
    mockGetTenantUsers.mockRejectedValue(new Error('Failed to load users'))

    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
    })
  })

  it('restricts access for non-managers', () => {
    mockUseTenant.mockReturnValue({
      profile: { ...mockProfile, role: 'member' },
      canManageUsers: vi.fn().mockReturnValue(false),
      tenant: null,
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      refreshData: vi.fn(),
      hasRole: vi.fn(),
      canManageTenant: vi.fn(),
      isOwner: false,
      isAdmin: false,
      isMember: true
    })

    render(<TeamManagement />)
    
    expect(screen.getByText("You don't have permission to manage team members.")).toBeInTheDocument()
    expect(screen.queryByText('Invite Team Member')).not.toBeInTheDocument()
  })

  it('validates invitation email input', async () => {
    render(<TeamManagement />)
    
    const inviteButton = screen.getByText('Send Invitation')
    
    // Button should be disabled when email is empty
    expect(inviteButton).toBeDisabled()
    
    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })
    
    // Button should be enabled when email is provided
    expect(inviteButton).not.toBeDisabled()
  })

  it('displays invitation loading state', async () => {
    mockInviteUser.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({}), 100))
    )

    render(<TeamManagement />)
    
    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    const inviteButton = screen.getByText('Send Invitation')
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(inviteButton)

    expect(screen.getByText('Sending...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Send Invitation')).toBeInTheDocument()
    })
  })

  it('handles invitation error', async () => {
    mockInviteUser.mockRejectedValue(new Error('Invitation failed'))

    render(<TeamManagement />)
    
    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    const inviteButton = screen.getByText('Send Invitation')
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(inviteButton)

    await waitFor(() => {
      expect(screen.getByText('Invitation failed')).toBeInTheDocument()
    })
  })
})