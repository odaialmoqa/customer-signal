import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 })
    }

    // Check if user already has a tenant
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.tenant_id) {
      return NextResponse.json({ error: 'User already has a tenant' }, { status: 400 })
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: name.trim(),
        created_by: user.id
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
    }

    // Update user profile with tenant_id
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        tenant_id: tenant.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Try to clean up the tenant if profile update fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: 'Failed to associate user with tenant' }, { status: 500 })
    }

    return NextResponse.json({
      tenant,
      message: 'Tenant created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in tenant creation:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}