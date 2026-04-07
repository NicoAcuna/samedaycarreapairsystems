import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/report') ||
    path.startsWith('/api/') ||
    path.startsWith('/onboarding') ||
    path === '/favicon.ico' ||
    path.startsWith('/_next')

  // Check session by looking for the Supabase auth cookie (no network call)
  const hasSession = request.cookies.getAll().some(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && (path.startsWith('/login') || path.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next({ request })
}
