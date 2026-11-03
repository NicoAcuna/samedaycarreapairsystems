import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BUNNY_API_KEY   = process.env.BUNNY_API_KEY!
const BUNNY_STORAGE   = process.env.BUNNY_STORAGE_ZONE!
const BUNNY_REGION    = process.env.BUNNY_REGION!
const BUNNY_CDN_URL   = process.env.BUNNY_CDN_URL!
const BUNNY_STORAGE_URL = `https://${BUNNY_REGION}.storage.bunnycdn.com/${BUNNY_STORAGE}`

function normalisePath(pathOrUrl: string) {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const prefix = `${BUNNY_CDN_URL}/`
    if (pathOrUrl.startsWith(prefix)) {
      return pathOrUrl.slice(prefix.length)
    }

    try {
      const url = new URL(pathOrUrl)
      return url.pathname.replace(/^\/+/, '')
    } catch {
      return ''
    }
  }

  return pathOrUrl.replace(/^\/+/, '')
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const path = normalisePath(body?.path || body?.url || '')

    if (!path) {
      return NextResponse.json({ error: 'No media path provided' }, { status: 400 })
    }

    const res = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'DELETE',
      headers: {
        AccessKey: BUNNY_API_KEY,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Bunny delete failed: ${text}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
