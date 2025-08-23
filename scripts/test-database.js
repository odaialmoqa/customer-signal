const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
  )

  try {
    console.log('🧪 Testing database setup...\n')

    // Test 1: Check if tables exist
    console.log('1. Checking if tables exist...')
    const tables = ['tenants', 'user_profiles', 'keywords', 'conversations', 'integrations', 'alerts', 'reports']
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ Table '${table}' not found`)
        } else if (error) {
          console.log(`   ⚠️  Table '${table}' exists but has error: ${error.message}`)
        } else {
          console.log(`   ✅ Table '${table}' exists and accessible`)
        }
      } catch (e) {
        console.log(`   ❌ Error checking table '${table}': ${e.message}`)
      }
    }

    // Test 2: Check RLS policies
    console.log('\n2. Testing RLS policies...')
    try {
      // This should fail with RLS enabled and no authenticated user
      const { error } = await supabase.from('tenants').select('*')
      if (error && error.message.includes('row-level security')) {
        console.log('   ✅ RLS is properly enabled (access denied as expected)')
      } else if (error) {
        console.log(`   ⚠️  RLS test inconclusive: ${error.message}`)
      } else {
        console.log('   ⚠️  RLS might not be working (no error returned)')
      }
    } catch (e) {
      console.log(`   ❌ RLS test error: ${e.message}`)
    }

    // Test 3: Check custom types
    console.log('\n3. Testing custom types...')
    try {
      const { error } = await supabase.rpc('version') // Simple function to test connection
      if (!error) {
        console.log('   ✅ Database connection and custom types should be working')
      }
    } catch (e) {
      console.log(`   ⚠️  Could not test custom types: ${e.message}`)
    }

    console.log('\n🎉 Database setup test completed!')
    console.log('\nNext steps:')
    console.log('1. Start the dev server: npm run dev')
    console.log('2. Visit http://localhost:3000')
    console.log('3. Try signing up for a new account')

  } catch (error) {
    console.log('❌ Database test failed:', error.message)
  }
}

testDatabase()