export const NSW_STATE = 'NSW'

export const NSW_SUBURB_POSTCODES = [
  { suburb: 'Alexandria', postcode: '2015' },
  { suburb: 'Ashfield', postcode: '2131' },
  { suburb: 'Bankstown', postcode: '2200' },
  { suburb: 'Blacktown', postcode: '2148' },
  { suburb: 'Bondi', postcode: '2026' },
  { suburb: 'Bondi Beach', postcode: '2026' },
  { suburb: 'Bondi Junction', postcode: '2022' },
  { suburb: 'Bronte', postcode: '2024' },
  { suburb: 'Burwood', postcode: '2134' },
  { suburb: 'Campsie', postcode: '2194' },
  { suburb: 'Canterbury', postcode: '2193' },
  { suburb: 'Chatswood', postcode: '2067' },
  { suburb: 'Coogee', postcode: '2034' },
  { suburb: 'Croydon', postcode: '2132' },
  { suburb: 'Croydon Park', postcode: '2133' },
  { suburb: 'Cremorne', postcode: '2090' },
  { suburb: 'Cremorne Point', postcode: '2090' },
  { suburb: 'Drummoyne', postcode: '2047' },
  { suburb: 'Dulwich Hill', postcode: '2203' },
  { suburb: 'Edgecliff', postcode: '2027' },
  { suburb: 'Five Dock', postcode: '2046' },
  { suburb: 'Granville', postcode: '2142' },
  { suburb: 'Harris Park', postcode: '2150' },
  { suburb: 'Homebush', postcode: '2140' },
  { suburb: 'Hurstville', postcode: '2220' },
  { suburb: 'Leichhardt', postcode: '2040' },
  { suburb: 'Liverpool', postcode: '2170' },
  { suburb: 'Malabar', postcode: '2036' },
  { suburb: 'Marrickville', postcode: '2204' },
  { suburb: 'Mascot', postcode: '2020' },
  { suburb: 'Merrylands', postcode: '2160' },
  { suburb: 'Miranda', postcode: '2228' },
  { suburb: 'Moorebank', postcode: '2170' },
  { suburb: 'Mosman', postcode: '2088' },
  { suburb: 'Newtown', postcode: '2042' },
  { suburb: 'Neutral Bay', postcode: '2089' },
  { suburb: 'North Parramatta', postcode: '2151' },
  { suburb: 'Parramatta', postcode: '2150' },
  { suburb: 'Penrith', postcode: '2750' },
  { suburb: 'Petersham', postcode: '2049' },
  { suburb: 'Randwick', postcode: '2031' },
  { suburb: 'Rhodes', postcode: '2138' },
  { suburb: 'Rockdale', postcode: '2216' },
  { suburb: 'Rozelle', postcode: '2039' },
  { suburb: 'Strathfield', postcode: '2135' },
  { suburb: 'Summer Hill', postcode: '2130' },
  { suburb: 'Surry Hills', postcode: '2010' },
  { suburb: 'Sydney', postcode: '2000' },
  { suburb: 'Tempe', postcode: '2044' },
  { suburb: 'Waverley', postcode: '2024' },
  { suburb: 'Westmead', postcode: '2145' },
  { suburb: 'Wiley Park', postcode: '2195' },
  { suburb: 'Wolli Creek', postcode: '2205' },
] as const

export const NSW_SUBURB_SUGGESTIONS = NSW_SUBURB_POSTCODES.map(option => option.suburb)

export function normalizeNswState() {
  return NSW_STATE
}

export function getPostcodeForSuburb(suburb: string) {
  const normalized = suburb.trim().toLowerCase()
  return NSW_SUBURB_POSTCODES.find(option => option.suburb.toLowerCase() === normalized)?.postcode ?? ''
}

export function normalizeOptionalPostcode(postcode: string) {
  const digits = postcode.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

export function normalizeOptionalInteger(value: string) {
  const digits = value.trim()
  return digits ? Number(digits) : null
}

export function formatClientLocation(suburb?: string | null, state?: string | null, postcode?: string | number | null) {
  return [suburb, state, postcode == null ? null : String(postcode)].filter(Boolean).join(' ') || '—'
}
