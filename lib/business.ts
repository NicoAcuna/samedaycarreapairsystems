// Business contact details that go out to customers.
//
// These were hardcoded in three places (the public report, the report email and
// the mechanic invite email) and had drifted apart from the number published on
// samedaycarrepair.com.au — customers were seeing two different numbers depending
// on where they looked. One constant, one place to change it.
//
// NEXT_PUBLIC_ so client components can read it too.

export const BUSINESS_NAME = 'Same Day Car Repair'

export const BUSINESS_PHONE =
  process.env.NEXT_PUBLIC_BUSINESS_PHONE || '0424 225 942'

// International form for wa.me links: 0424 225 942 -> 61424225942
export function toWaNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('61')) return digits
  if (digits.startsWith('0')) return `61${digits.slice(1)}`
  return digits
}

export const BUSINESS_WA_NUMBER = toWaNumber(BUSINESS_PHONE)
