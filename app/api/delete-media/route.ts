import { NextRequest, NextResponse } from 'next/server'

const BUNNY_API_KEY   = process.env.BUNNY_API_KEY!
const BUNNY_STORAGE   = 'sdcrsystems'
const BUNNY_REGION    = 'syd'
const BUNNY_CDN_URL   = 'https://sdcrsystems.b-cdn.net'
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
