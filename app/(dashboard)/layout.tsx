import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('active_company_id, company_id')
    .eq('id', user.id)
    .single()

  if (!(userData?.active_company_id || userData?.company_id)) {
    redirect('/register')
  }

  return (
    <div className="flex h-screen bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        {children}
      </main>
    </div>
  )
}
