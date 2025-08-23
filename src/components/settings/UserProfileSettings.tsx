'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/hooks/useTenant'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/tenant'

interface UserProfileSettingsProps {
  onProfileUpdate?: (profile: UserProfile) => void
}

export default function UserProfileSettings({ onProfileUpdate }: UserProfileSettingsProps) {
  const { profile, refreshData } = useTenant()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || ''
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Update user profile
      const { data: updatedProfile, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          avatar_url: formData.avatar_url.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select()
        .single()

      if (profileError) throw profileError

      // Update auth user metadata if email changed
      if (formData.email !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        })
        if (authError) throw authError
      }

      setSuccess('Profile updated successfully')
      await refreshData()
      onProfileUpdate?.(updatedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  if (!profile) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Picture
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-700">
                    {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : formData.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a URL for your profile picture
              </p>
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Changing your email will require verification
          </p>
        </div>

        {/* Account Information */}
        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{profile.role}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}