import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (authError || sessionError) {
      return NextResponse.json({ 
        authenticated: false, 
        user: null, 
        session: null,
        error: authError?.message || sessionError?.message 
      }, { status: 401 })
    }

    if (!user || !session) {
      return NextResponse.json({ 
        authenticated: false, 
        user: null, 
        session: null 
      }, { status: 401 })
    }

    // Get user profile if available
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, name')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0],
        tenant_id: profile?.tenant_id || null
      },
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at
      }
    })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    )
  }
}