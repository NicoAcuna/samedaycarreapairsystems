import { google } from 'googleapis'

function makeOAuthClient(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

// Parse "viernes a las 4:30pm", "miércoles a las 4pm", "friday at 4pm", etc.
function parseAppointmentTime(when: string): Date | null {
  const daysEs: Record<string, number> = {
    lunes: 1, martes: 2, 'miércoles': 3, miercoles: 3,
    jueves: 4, viernes: 5, 'sábado': 6, sabado: 6, domingo: 0,
  }
  const daysEn: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0,
  }

  const lower = when.toLowerCase()

  let targetDay: number | null = null
  for (const [name, num] of Object.entries({ ...daysEs, ...daysEn })) {
    if (lower.includes(name)) { targetDay = num; break }
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  let hour = timeMatch ? parseInt(timeMatch[1]) : 10
  const minute = timeMatch ? parseInt(timeMatch[2] || '0') : 0
  const meridiem = timeMatch?.[3]
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  if (!meridiem && hour < 8) hour += 12 // assume pm for ambiguous times

  const now = new Date()
  const sydney = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }))

  if (targetDay === null) return null

  const result = new Date(sydney)
  result.setHours(hour, minute, 0, 0)
  const daysUntil = (targetDay - sydney.getDay() + 7) % 7 || 7
  result.setDate(result.getDate() + daysUntil)
  return result
}

export async function createAppointmentEvent(args: {
  clientName: string
  vehicle?: string | null
  suburb?: string | null
  jobType?: string | null
  jobDescription?: string | null
  confirmedTime: string
}) {
  const tokens: string[] = [
    process.env.GOOGLE_REFRESH_TOKEN_NICO,
    process.env.GOOGLE_REFRESH_TOKEN_SDCR,
  ].filter(Boolean) as string[]

  if (!tokens.length || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[calendar] Google credentials not configured — skipping event creation')
    return
  }

  const start = parseAppointmentTime(args.confirmedTime)
  if (!start) {
    console.warn('[calendar] Could not parse time from:', args.confirmedTime)
    return
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000) // 1h block

  const summary = `🔧 ${args.clientName}${args.vehicle ? ` — ${args.vehicle}` : ''}`
  const description = [
    args.jobType ? `Servicio: ${args.jobType}` : null,
    args.jobDescription ? `Descripción: ${args.jobDescription}` : null,
    args.suburb ? `Ubicación: ${args.suburb}` : null,
    `Hora confirmada: ${args.confirmedTime}`,
  ].filter(Boolean).join('\n')

  await Promise.allSettled(tokens.map(async refreshToken => {
    try {
      const auth = makeOAuthClient(refreshToken)
      const calendar = google.calendar({ version: 'v3', auth })
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          location: args.suburb || undefined,
          start: { dateTime: start.toISOString(), timeZone: 'Australia/Sydney' },
          end: { dateTime: end.toISOString(), timeZone: 'Australia/Sydney' },
        },
      })
      console.log('[calendar] ✅ Event created for token ending in', refreshToken.slice(-6))
    } catch (e: any) {
      console.error('[calendar] Event creation failed:', e.message)
    }
  }))
}
