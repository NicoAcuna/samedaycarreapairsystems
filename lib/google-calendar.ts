import { google } from 'googleapis'

function makeOAuthClient(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

const SYDNEY_TZ = 'Australia/Sydney'

// Wall-clock parts of an instant in Sydney (no string round-trip through Date,
// which was silently swapping day/month for days ≤ 12).
function sydneyParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SYDNEY_TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value || ''
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  }
}

// Sydney's UTC offset (minutes) on a given date — handles AEST/AEDT (DST).
function sydneyOffsetMinutes(y: number, m: number, d: number, hh: number, mm: number): number {
  const asUTC = Date.UTC(y, m - 1, d, hh, mm, 0)
  const local = new Date(asUTC)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SYDNEY_TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(local)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
  const asIfUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asIfUTC - asUTC) / 60000)
}

// Build a Date for the given Sydney wall-clock time, correct across DST.
function sydneyWallClockToDate(y: number, m: number, d: number, hh: number, mm: number): Date {
  const offset = sydneyOffsetMinutes(y, m, d, hh, mm)
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - offset * 60000)
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

  if (targetDay === null) return null

  // Resolve "today" in Sydney, then walk forward to the next matching weekday
  // and build the absolute instant for that Sydney wall-clock time.
  const today = sydneyParts(new Date())
  const daysUntil = (targetDay - today.weekday + 7) % 7 || 7
  const base = Date.UTC(today.year, today.month - 1, today.day) + daysUntil * 86400000
  const target = new Date(base)
  return sydneyWallClockToDate(
    target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), hour, minute,
  )
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
      console.log('[calendar] ✅ Event created')
    } catch (e: any) {
      console.error('[calendar] Event creation failed:', e.message)
    }
  }))
}
