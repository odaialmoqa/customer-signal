import { SearchPage } from '@/components/search'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Search() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's tenant ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.tenant_id) {
    redirect('/onboarding')
  }

  return (
    <SearchPage 
      tenantId={profile.tenant_id}
    />
  )
}