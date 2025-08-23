'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/lib/hooks/useTenant'
import { createClient } from '@/lib/supabase/client'

function OnboardingContent() {
  const [step, setStep] = useState<'loading' | 'create-tenant' | 'accept-invitation' | 'complete'>('loading')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tenant, profile, createTenant, acceptInvitation, refreshData } = useTenant()
  const supabase = createClient()
  
  const invitationId = searchParams.get('invitation')

  useEffect(() => {
    const checkUserStatus = async () => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Refresh tenant data
      await refreshData()

      // Determine next step based on user status
      if (profile && tenant) {
        // User already has a tenant, redirect to dashboard
        router.push('/dashboard')
      } else if (invitationId) {
        // User has an invitation to accept
        setStep('accept-invitation')
      } else {
        // User needs to create a tenant
        setStep('create-tenant')
      }
    }

    checkUserStatus()
  }, [profile, tenant, invitationId, router, refreshData, supabase.auth])

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) return

    setLoading(true)
    setError(null)

    try {
      await createTenant(companyName.trim())
      setStep('complete')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitationId) return

    setLoading(true)
    setError(null)

    try {
      await acceptInvitation(invitationId)
      setStep('complete')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  if (step === 'create-tenant') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Welcome to CustomerSignal
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let&apos;s set up your company workspace
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form onSubmit={handleCreateTenant} className="space-y-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your company name"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating workspace...' : 'Create Workspace'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'accept-invitation') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Join Team
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            You&apos;ve been invited to join a CustomerSignal workspace
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-gray-700 mb-6">
                Click below to accept the invitation and join the team.
              </p>

              {error && (
                <div className="text-red-600 text-sm mb-4">{error}</div>
              )}

              <button
                onClick={handleAcceptInvitation}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Accepting invitation...' : 'Accept Invitation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">All set!</h2>
          <p className="mt-2 text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return null
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}