'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PublicOnboarding() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [keywords, setKeywords] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const availablePlatforms = [
    { id: 'twitter', name: 'Twitter', description: 'Monitor tweets and mentions' },
    { id: 'reddit', name: 'Reddit', description: 'Track discussions and posts' },
    { id: 'news', name: 'News Sites', description: 'Monitor news articles' },
    { id: 'forums', name: 'Forums', description: 'Track forum discussions' },
    { id: 'reviews', name: 'Review Sites', description: 'Monitor customer reviews' }
  ]

  useEffect(() => {
    // For public onboarding, we'll skip auth check and allow demo mode
    setLoading(false)
    setUser({ id: 'demo-user', email: 'demo@example.com' }) // Demo user for public onboarding
  }, [])

  const handlePlatformToggle = (platformId: string) => {
    setPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSaveKeywords = async () => {
    if (!user || !keywords.trim()) {
      setError('Please enter at least one keyword')
      return
    }

    setSaving(true)
    setError('')

    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k)
      
      // Save keywords
      const keywordPromises = keywordList.map(keyword => 
        supabase.from('keywords').insert({
          keyword: keyword,
          tenant_id: user.id, // Using user.id as tenant_id for now
          created_by: user.id,
          is_active: true
        })
      )

      await Promise.all(keywordPromises)
      setCurrentStep(2)
    } catch (err) {
      console.error('Save keywords error:', err)
      setError('Error saving keywords')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePlatforms = async () => {
    if (platforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Save platform preferences (this would typically be saved to user preferences)
      console.log('Selected platforms:', platforms)
      
      // Mark onboarding as complete
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update profile error:', updateError)
        setError('Error completing onboarding')
        return
      }

      // Redirect to dashboard
      router.push('/public/dashboard')
    } catch (err) {
      console.error('Save platforms error:', err)
      setError('Error saving platform preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome to Customer Signal</h1>
              <p className="mt-2 text-gray-600">Let's get you set up in just a few steps</p>
            </div>

            {/* Progress indicator */}
            <div className="mb-8">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>Keywords</span>
                <span>Platforms</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  What keywords would you like to monitor?
                </h2>
                <p className="text-gray-600 mb-6">
                  Enter keywords or phrases separated by commas. For example: "your brand name, product name, competitor name"
                </p>
                <div className="mb-6">
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Enter keywords separated by commas..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveKeywords}
                    disabled={saving || !keywords.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Next'}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Which platforms would you like to monitor?
                </h2>
                <p className="text-gray-600 mb-6">
                  Select the platforms where you want to track mentions of your keywords.
                </p>
                <div className="space-y-4 mb-6">
                  {availablePlatforms.map((platform) => (
                    <div key={platform.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={platform.id}
                          type="checkbox"
                          checked={platforms.includes(platform.id)}
                          onChange={() => handlePlatformToggle(platform.id)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={platform.id} className="font-medium text-gray-700">
                          {platform.name}
                        </label>
                        <p className="text-gray-500">{platform.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSavePlatforms}
                    disabled={saving || platforms.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Completing...' : 'Complete Setup'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}