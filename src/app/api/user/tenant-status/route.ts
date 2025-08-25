import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and tenant status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        email,
        name,
        created_at,
        tenants (
          id,
          name,
          created_at
        )
      `)
      .eq('id', user.id)
      .single()

    const hasProfile = !profileError && profile
    const hasTenant = hasProfile && profile.tenant_id

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      has_profile: hasProfile,
      has_tenant: hasTenant,
      profile: hasProfile ? profile : null,
      needs_onboarding: !hasTenant
    })
  } catch (error) {
    console.error('Error checking tenant status:', error)
    return NextResponse.json(
      { error: 'Failed to check tenant status' },
      { status: 500 }
    )
  }
}