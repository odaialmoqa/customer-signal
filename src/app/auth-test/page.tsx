import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function AuthTest() {
  const supabase = createClient()
  
  try {
    // Test basic Supabase connection
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Test database connection
    const { data: testData, error: dbError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication & Database Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold">User Authentication Status</h2>
            {userError ? (
              <p className="text-red-600">Auth Error: {userError.message}</p>
            ) : (
              <p className="text-green-600">
                User: {user ? user.email || 'Authenticated' : 'Not authenticated'}
              </p>
            )}
          </div>
          
          <div className="p-4 border rounded">
            <h2 className="font-semibold">Database Connection</h2>
            {dbError ? (
              <p className="text-red-600">DB Error: {dbError.message}</p>
            ) : (
              <p className="text-green-600">Database connection successful</p>
            )}
          </div>
          
          <div className="p-4 border rounded">
            <h2 className="font-semibold">Environment Variables</h2>
            <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            <p>Service Role Key: {process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Quick Actions</h2>
          <div className="space-x-2">
            <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded">Go to Login</a>
            <a href="/signup" className="bg-green-500 text-white px-4 py-2 rounded">Go to Signup</a>
            <a href="/dashboard" className="bg-purple-500 text-white px-4 py-2 rounded">Go to Dashboard</a>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-red-600">Critical Error</h1>
        <p className="text-red-600">
          Failed to initialize: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }
}