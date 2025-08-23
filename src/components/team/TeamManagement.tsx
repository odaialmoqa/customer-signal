'use client'

import { useState, useEffect } from 'react'
import { TenantService } from '@/lib/services/tenant'
import { useTenant } from '@/lib/hooks/useTenant'
import type { UserProfile, TenantInvitation } from '@/lib/types/tenant'

export default function TeamManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [invitations, setInvitations] = useState<TenantInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  
  const { profile, canManageUsers } = useTenant()
  const tenantService = new TenantService()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, invitationsData] = await Promise.all([
        tenantService.getTenantUsers(),
        loadInvitations()
      ])
      setUsers(usersData)
      setInvitations(invitationsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadInvitations = async (): Promise<TenantInvitation[]> => {
    // This would typically be a method in TenantService
    // For now, return empty array as placeholder
    return []
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setError(null)

    try {
      await tenantService.inviteUser({
        email: inviteEmail.trim(),
        role: inviteRole
      })
      
      setInviteEmail('')
      alert(`Invitation sent to ${inviteEmail}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await tenantService.updateUserRole(userId, newRole)
      await loadData() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
    }
  }

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return
    }

    try {
      await tenantService.removeUser(userId)
      await loadData() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  if (!canManageUsers()) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Team Management</h2>
        <p className="text-gray-600">You don&apos;t have permission to manage team members.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Team Management</h2>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'members'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Members ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'invitations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Invitations ({invitations.length})
          </button>
        </div>
      </div>
      
      {/* Invite User Form */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-md font-medium text-gray-900 mb-4">Invite Team Member</h3>
        <form onSubmit={handleInviteUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="colleague@company.com"
              />
            </div>
            <div>
              <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={inviteLoading || !inviteEmail.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'members' ? (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Team Members</h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || user.email}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'owner' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.id !== profile?.id && user.role !== 'owner' && (
                          <div className="flex items-center justify-end space-x-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'member')}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveUser(user.id, user.full_name || user.email)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Pending Invitations</h3>
          
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invitation.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {/* TODO: Implement resend invitation */}}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => {/* TODO: Implement cancel invitation */}}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}