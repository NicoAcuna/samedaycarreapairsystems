import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { to, subject, message, reportUrl } = await req.json()

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #171717; padding: 24px; border-radius: 12px 12px 0 0;">
        <div style="color: #4ade80; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">SAME DAY CAR REPAIR</div>
        <div style="color: white; font-size: 20px; font-weight: 700;">Your Report is Ready</div>
        <div style="color: #a3a3a3; font-size: 12px; margin-top: 4px;">Mobile Mechanic · 0439 269 598</div>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p style="color: #404040; font-size: 15px; margin: 0 0 16px;">${message}</p>
        <p style="color: #737373; font-size: 13px; margin: 0 0 24px;">Your full report is available online. Click the button below to view and download it.</p>
        <a href="${baseUrl}${reportUrl}"
           style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Report →
        </a>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #a3a3a3; font-size: 12px; margin: 0;">
          Same Day Car Repair · Mobile Mechanic Service · Sydney, NSW<br/>
          This report was generated automatically after your service.
        </p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Same Day Car Repair <reports@samedaycarrepair.com.au>',
        reply_to: 'samedaycarrepair@gmail.com',
        to: Array.isArray(to) ? to : [to],
        bcc: ['samedaycarrepair@gmail.com'],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[send-report] Resend error:', JSON.stringify(err))
      return NextResponse.json({ error: err?.message || JSON.stringify(err) }, { status: res.status })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
