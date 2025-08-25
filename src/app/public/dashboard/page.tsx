'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  user_id: string
  tenant_id: string | null
  name: string | null
  email: string
  onboarding_completed: boolean
}

interface Tenant {
  id: string
  name: string
  created_at: string
}

export default function PublicDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creatingTenant, setCreatingTenant] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/public/auth/login')
        return
      }

      setUser(user)

      // Check if user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError)
        setError('Error loading user profile')
        return
      }

      if (!profileData) {
        // Create user profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
          })
          .select()
          .single()

        if (createError) {
          console.error('Create profile error:', createError)
          setError('Error creating user profile')
          return
        }

        setProfile(newProfile)
      } else {
        setProfile(profileData)

        // If user has a tenant, load tenant info
        if (profileData.tenant_id) {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profileData.tenant_id)
            .single()

          if (!tenantError && tenantData) {
            setTenant(tenantData)
          }
        }
      }
    } catch (err) {
      console.error('Check user error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createTenant = async () => {
    if (!user || !profile) return

    setCreatingTenant(true)
    setError('')

    try {
      // Create a new tenant
      const tenantName = `${profile.name || user.email?.split('@')[0] || 'User'}'s Organization`
      
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          owner_id: user.id
        })
        .select()
        .single()

      if (tenantError) {
        console.error('Tenant creation error:', tenantError)
        setError('Error creating organization: ' + tenantError.message)
        return
      }

      // Update user profile with tenant_id
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          tenant_id: newTenant.id,
          onboarding_completed: true
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('Error updating profile: ' + updateError.message)
        return
      }

      setTenant(newTenant)
      setProfile({ ...profile, tenant_id: newTenant.id, onboarding_completed: true })
    } catch (err) {
      console.error('Create tenant error:', err)
      setError('An unexpected error occurred')
    } finally {
      setCreatingTenant(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/public')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Customer Signal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {profile?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!tenant ? (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Welcome to Customer Signal!
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>
                    To get started, we need to create an organization for you. This will allow you to
                    manage your team, keywords, and monitoring settings.
                  </p>
                </div>
                <div className="mt-5">
                  <button
                    onClick={createTenant}
                    disabled={creatingTenant}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {creatingTenant ? 'Creating...' : 'Create Organization'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {tenant.name}
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Your organization is set up and ready to go!</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">K</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Keywords
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">0</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <a href="/public/keywords" className="font-medium text-blue-700 hover:text-blue-900">
                        Manage keywords
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">C</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Conversations
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">0</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <a href="/public/conversations" className="font-medium text-green-700 hover:text-green-900">
                        View conversations
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-medium">A</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Alerts
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">0</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <a href="/public/alerts" className="font-medium text-purple-700 hover:text-purple-900">
                        Setup alerts
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Quick Actions
                  </h3>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <a
                      href="/public/onboarding"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Complete Setup
                    </a>
                    <a
                      href="/public/help"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Get Help
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}