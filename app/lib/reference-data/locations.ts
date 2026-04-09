export const NSW_STATE = 'NSW'

export const NSW_SUBURB_SUGGESTIONS = [
  'Alexandria',
  'Ashfield',
  'Bankstown',
  'Blacktown',
  'Bondi',
  'Bondi Beach',
  'Bondi Junction',
  'Bronte',
  'Burwood',
  'Campsie',
  'Canterbury',
  'Chatswood',
  'Coogee',
  'Croydon',
  'Croydon Park',
  'Drummoyne',
  'Dulwich Hill',
  'Five Dock',
  'Granville',
  'Harris Park',
  'Homebush',
  'Hurstville',
  'Leichhardt',
  'Liverpool',
  'Marrickville',
  'Mascot',
  'Merrylands',
  'Miranda',
  'Moorebank',
  'Newtown',
  'North Parramatta',
  'Parramatta',
  'Penrith',
  'Petersham',
  'Randwick',
  'Rhodes',
  'Rockdale',
  'Rozelle',
  'Surry Hills',
  'Strathfield',
  'Summer Hill',
  'Sydney',
  'Tempe',
  'Waverley',
  'Westmead',
  'Wiley Park',
  'Wolli Creek',
]

export function normalizeNswState() {
  return NSW_STATE
}

export function formatClientLocation(suburb?: string | null, state?: string | null, postcode?: string | null) {
  return [suburb, state, postcode].filter(Boolean).join(' ') || '—'
}
