export type LocationOption = {
  city: string
  state: string
  suburbs: string[]
}

export const LOCATION_OPTIONS: LocationOption[] = [
  {
    city: 'Sydney',
    state: 'NSW',
    suburbs: [
      'Alexandria',
      'Bondi',
      'Bondi Junction',
      'Bronte',
      'Coogee',
      'Marrickville',
      'Maroubra',
      'Newtown',
      'Randwick',
      'Surry Hills',
    ],
  },
  {
    city: 'Parramatta',
    state: 'NSW',
    suburbs: [
      'Granville',
      'Harris Park',
      'Merrylands',
      'North Parramatta',
      'Parramatta',
      'Westmead',
    ],
  },
  {
    city: 'Blacktown',
    state: 'NSW',
    suburbs: [
      'Blacktown',
      'Doonside',
      'Mount Druitt',
      'Prospect',
      'Rooty Hill',
      'Seven Hills',
    ],
  },
  {
    city: 'Liverpool',
    state: 'NSW',
    suburbs: [
      'Casula',
      'Chipping Norton',
      'Hoxton Park',
      'Liverpool',
      'Moorebank',
      'Prestons',
    ],
  },
]

export function getSuburbsForCity(city: string) {
  return LOCATION_OPTIONS.find(option => option.city === city)?.suburbs ?? []
}

export function getStateForCity(city: string) {
  return LOCATION_OPTIONS.find(option => option.city === city)?.state ?? ''
}

export function formatClientLocation(city?: string | null, suburb?: string | null, state?: string | null) {
  return [suburb, city, state].filter(Boolean).join(', ') || '—'
}
