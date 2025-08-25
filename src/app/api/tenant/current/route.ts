import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        tenant_id,
        tenants (
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.tenant_id) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 404 })
    }

    return NextResponse.json({
      tenant: profile.tenants,
      user_id: user.id
    })
  } catch (error) {
    console.error('Error fetching current tenant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    )
  }
}