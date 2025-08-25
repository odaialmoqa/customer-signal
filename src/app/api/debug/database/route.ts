import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Auth error',
        details: authError.message 
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'No user found' 
      }, { status: 401 })
    }

    // Test database connection by checking if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['tenants', 'user_profiles'])

    if (tablesError) {
      return NextResponse.json({
        error: 'Database query error',
        details: tablesError.message,
        code: tablesError.code
      }, { status: 500 })
    }

    // Check if user already has a profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      tables: tables,
      existingProfile: existingProfile,
      profileError: profileError?.message || null
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}