import { NextRequest, NextResponse } from 'next/server'

const BUNNY_API_KEY   = process.env.BUNNY_API_KEY!
const BUNNY_STORAGE   = 'sdcrsystems'
const BUNNY_REGION    = 'syd'  // Sydney endpoint prefix
const BUNNY_CDN_URL   = 'https://sdcrsystems.b-cdn.net'

// PUT https://sy.storage.bunnycdn.com/{storageZone}/{path}
const BUNNY_STORAGE_URL = `https://${BUNNY_REGION}.storage.bunnycdn.com/${BUNNY_STORAGE}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const path = `${folder}/${filename}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const res = await fetch(`${BUNNY_STORAGE_URL}/${path}`, {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_API_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Bunny upload failed: ${text}` }, { status: 500 })
    }

    const url = `${BUNNY_CDN_URL}/${path}`
    return NextResponse.json({ url, path })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
