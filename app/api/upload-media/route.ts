import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BUNNY_API_KEY   = process.env.BUNNY_API_KEY!

// Only accept media the app actually produces.
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'pdf', 'mp4', 'mov', 'webm'])
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const BUNNY_STORAGE   = process.env.BUNNY_STORAGE_ZONE!
const BUNNY_REGION    = process.env.BUNNY_REGION!
const BUNNY_CDN_URL   = process.env.BUNNY_CDN_URL!

// PUT https://sy.storage.bunnycdn.com/{storageZone}/{path}
const BUNNY_STORAGE_URL = `https://${BUNNY_REGION}.storage.bunnycdn.com/${BUNNY_STORAGE}`

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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    // Keep the folder to a safe slug so a caller can't path-traverse the zone.
    const rawFolder = (formData.get('folder') as string) || 'uploads'
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'uploads'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const path = `${folder}/${filename}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const res = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Bunny upload failed response: status=${res.status} path=${path} fileName=${file.name} fileType=${file.type || 'unknown'} fileSize=${file.size} body=${text}`)
      return NextResponse.json({ error: `Bunny upload failed: ${text}` }, { status: 500 })
    }

    const url = `${BUNNY_CDN_URL}/${path}`
    return NextResponse.json({ url, path })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : ''
    console.error(`Upload media route failed: ${message}${stack ? `\n${stack}` : ''}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
