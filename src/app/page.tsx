// Redirect to public landing page to avoid Vercel SSO issues
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/public')
}