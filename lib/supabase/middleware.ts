import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/report') || path.startsWith('/api/public-report')
  const isOnboarding = path.startsWith('/onboarding')

  // Not logged in → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in → check if company is set up
  if (user && !isPublic && !isOnboarding) {
    const { data: userData } = await supabase
      .from('users')
      .select('active_company_id, company_id')
      .eq('id', user.id)
      .single()

    // No company yet → onboarding
    if (!(userData?.active_company_id || userData?.company_id)) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Logged in + has company + going to login/register → dashboard
  if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}