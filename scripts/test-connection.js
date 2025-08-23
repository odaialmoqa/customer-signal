const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    console.log('Testing Supabase connection...')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    // Test basic connection
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connection successful! (Table not found is expected)')
    } else if (error) {
      console.log('❌ Connection error:', error.message)
    } else {
      console.log('✅ Connection successful!')
    }

    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.log('❌ Auth error:', authError.message)
    } else {
      console.log('✅ Auth service accessible')
    }

  } catch (error) {
    console.log('❌ Connection failed:', error.message)
  }
}

testConnection()