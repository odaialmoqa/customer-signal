import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ensureUserTenantAssociationServer } from '@/lib/services/tenant-auto-creation'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Ensure user has tenant association
    const result = await ensureUserTenantAssociationServer(user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
      message: 'Tenant association verified'
    })

  } catch (error) {
    console.error('Ensure tenant API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check current tenant status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        tenant:tenants(*)
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { 
          error: 'Profile not found',
          needs_tenant: true,
          user_id: user.id
        },
        { status: 404 }
      )
    }

    if (!profile.tenant_id) {
      return NextResponse.json(
        {
          error: 'User not associated with tenant',
          needs_tenant: true,
          user_id: user.id
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
      tenant: profile.tenant,
      message: 'User has valid tenant association'
    })

  } catch (error) {
    console.error('Check tenant API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}