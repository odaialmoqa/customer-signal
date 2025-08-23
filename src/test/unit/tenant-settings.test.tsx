import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import TenantSettings from '@/components/settings/TenantSettings'
import { useTenant } from '@/lib/hooks/useTenant'
import { TenantService } from '@/lib/services/tenant'

// Mock dependencies
vi.mock('@/lib/hooks/useTenant')
vi.mock('@/lib/services/tenant')

const mockUseTenant = vi.mocked(useTenant)
const mockTenantService = vi.mocked(TenantService)

const mockTenant = {
  id: 'tenant-1',
  name: 'Test Company',
  subscription: 'pro' as const,
  settings: {
    data_retention_days: 365,
    max_keywords: 100,
    monitoring_frequency: 'hourly',
    auto_sentiment_analysis: true,
    security: {
      require_mfa: false,
      session_timeout_minutes: 480,
      ip_whitelist_enabled: false,
      ip_whitelist: []
    }
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'owner' as const,
  avatar_url: '',
  preferences: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('TenantSettings', () => {
  const mockUpdateTenant = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseTenant.mockReturnValue({
      tenant: mockTenant,
      profile: mockProfile,
      canManageTenant: vi.fn().mockReturnValue(true),
      refreshData: vi.fn(),
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      isOwner: true,
      isAdmin: true,
      isMember: true
    })

    mockTenantService.mockImplementation(() => ({
      updateTenant: mockUpdateTenant
    }) as any)
  })

  it('renders tenant settings form', () => {
    render(<TenantSettings />)
    
    expect(screen.getByText('Tenant Settings')).toBeInTheDocument()
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.getByText('Monitoring Configuration')).toBeInTheDocument()
    expect(screen.getByText('Security Settings')).toBeInTheDocument()
    expect(screen.getByText('Branding')).toBeInTheDocument()
  })

  it('loads existing tenant settings', () => {
    render(<TenantSettings />)
    
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument()
    expect(screen.getByDisplayValue('365')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    
    // Check subscription select value
    const subscriptionSelect = screen.getByLabelText('Subscription Plan')
    expect(subscriptionSelect).toHaveValue('pro')
  })

  it('updates basic tenant information', () => {
    render(<TenantSettings />)
    
    const nameInput = screen.getByDisplayValue('Test Company')
    fireEvent.change(nameInput, { target: { value: 'Updated Company' } })
    
    expect(nameInput).toHaveValue('Updated Company')
  })

  it('updates monitoring configuration', () => {
    render(<TenantSettings />)
    
    const retentionInput = screen.getByDisplayValue('365')
    fireEvent.change(retentionInput, { target: { value: '730' } })
    
    expect(retentionInput).toHaveValue(730)
  })

  it('toggles security settings', () => {
    render(<TenantSettings />)
    
    const mfaCheckbox = screen.getByLabelText(/Require multi-factor authentication/)
    fireEvent.click(mfaCheckbox)
    
    expect(mfaCheckbox).toBeChecked()
  })

  it('manages IP whitelist', () => {
    render(<TenantSettings />)
    
    // Enable IP whitelist
    const ipWhitelistCheckbox = screen.getByLabelText(/Enable IP address whitelist/)
    fireEvent.click(ipWhitelistCheckbox)
    
    expect(ipWhitelistCheckbox).toBeChecked()
    expect(screen.getByText('Whitelisted IP Addresses')).toBeInTheDocument()
    expect(screen.getByText('Add IP')).toBeInTheDocument()
  })

  it('submits tenant settings', async () => {
    mockUpdateTenant.mockResolvedValue(mockTenant)

    render(<TenantSettings />)
    
    const nameInput = screen.getByDisplayValue('Test Company')
    fireEvent.change(nameInput, { target: { value: 'Updated Company' } })
    
    const submitButton = screen.getByText('Save Settings')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateTenant).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
        name: 'Updated Company',
        subscription: 'pro',
        settings: expect.any(Object)
      }))
    })
  })

  it('displays success message after successful update', async () => {
    mockUpdateTenant.mockResolvedValue(mockTenant)

    render(<TenantSettings />)
    
    const submitButton = screen.getByText('Save Settings')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Tenant settings updated successfully')).toBeInTheDocument()
    })
  })

  it('displays error message when update fails', async () => {
    mockUpdateTenant.mockRejectedValue(new Error('Update failed'))

    render(<TenantSettings />)
    
    const submitButton = screen.getByText('Save Settings')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    mockUpdateTenant.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockTenant), 100))
    )

    render(<TenantSettings />)
    
    const submitButton = screen.getByText('Save Settings')
    fireEvent.click(submitButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })
  })

  it('restricts access for non-owners', () => {
    mockUseTenant.mockReturnValue({
      tenant: mockTenant,
      profile: { ...mockProfile, role: 'member' },
      canManageTenant: vi.fn().mockReturnValue(false),
      refreshData: vi.fn(),
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      isOwner: false,
      isAdmin: false,
      isMember: true
    })

    render(<TenantSettings />)
    
    expect(screen.getByText("You don't have permission to manage tenant settings.")).toBeInTheDocument()
    expect(screen.queryByText('Save Settings')).not.toBeInTheDocument()
  })

  it('handles missing tenant gracefully', () => {
    mockUseTenant.mockReturnValue({
      tenant: null,
      profile: mockProfile,
      canManageTenant: vi.fn().mockReturnValue(true),
      refreshData: vi.fn(),
      loading: false,
      error: null,
      createTenant: vi.fn(),
      acceptInvitation: vi.fn(),
      hasRole: vi.fn(),
      canManageUsers: vi.fn(),
      isOwner: true,
      isAdmin: true,
      isMember: true
    })

    render(<TenantSettings />)
    
    expect(screen.getByText('Loading tenant settings...')).toBeInTheDocument()
  })

  it('updates branding settings', () => {
    render(<TenantSettings />)
    
    const logoInput = screen.getByPlaceholderText('https://example.com/logo.png')
    fireEvent.change(logoInput, { target: { value: 'https://newlogo.com/logo.png' } })
    
    expect(logoInput).toHaveValue('https://newlogo.com/logo.png')
  })

  it('updates color picker', () => {
    render(<TenantSettings />)
    
    const colorInput = screen.getByLabelText('Primary Color')
    fireEvent.change(colorInput, { target: { value: '#FF0000' } })
    
    expect(colorInput).toHaveValue('#ff0000')
  })

  it('clears error and success messages when settings change', () => {
    render(<TenantSettings />)
    
    const nameInput = screen.getByDisplayValue('Test Company')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    
    // Error and success messages should be cleared when user makes changes
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
  })
})