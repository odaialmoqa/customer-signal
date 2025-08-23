export interface Tenant {
  id: string
  name: string
  subscription: 'free' | 'pro' | 'enterprise'
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string
  email: string
  full_name?: string
  role: 'owner' | 'admin' | 'member'
  avatar_url?: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenantInvitation {
  id: string
  tenant_id: string
  email: string
  role: 'admin' | 'member'
  invited_by: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export interface CreateTenantRequest {
  name: string
  subscription?: 'free' | 'pro' | 'enterprise'
}

export interface InviteUserRequest {
  email: string
  role: 'admin' | 'member'
}