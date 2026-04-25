export type VehicleCatalogOption = {
  make: string
  models: string[]
}

export const VEHICLE_CATALOG: VehicleCatalogOption[] = [
  { make: 'Audi', models: ['A1', 'A3', 'A4', 'A5', 'Q3', 'Q5', 'Q7'] },
  { make: 'BMW', models: ['1 Series', '3 Series', '5 Series', 'X1', 'X3', 'X5'] },
  { make: 'Ford', models: ['Everest', 'Fiesta', 'Focus', 'Mustang', 'Ranger', 'Transit'] },
  { make: 'Holden', models: ['Astra', 'Barina', 'Colorado', 'Commodore', 'Cruze', 'Trax'] },
  { make: 'Honda', models: ['Accord', 'Civic', 'CR-V', 'HR-V', 'Jazz', 'Odyssey'] },
  { make: 'Hyundai', models: ['Accent', 'Elantra', 'Getz', 'Grandeur', 'i30', 'i45', 'ix35', 'Kona', 'Santa Fe', 'Sonata', 'Tucson', 'Venue'] },
  { make: 'Isuzu', models: ['D-MAX', 'MU-X'] },
  { make: 'Jeep', models: ['Cherokee', 'Compass', 'Grand Cherokee', 'Gladiator', 'Patriot', 'Renegade', 'Wrangler'] },
  { make: 'Kia', models: ['Carnival', 'Cerato', 'Picanto', 'Rio', 'Sorento', 'Sportage'] },
  { make: 'Lexus', models: ['ES', 'IS', 'NX', 'RX', 'UX'] },
  { make: 'Mazda', models: ['BT-50', 'CX-3', 'CX-5', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6'] },
  { make: 'Mercedes-Benz', models: ['A-Class', 'B200', 'C-Class', 'E-Class', 'GLA', 'GLC', 'GLE'] },
  { make: 'Mitsubishi', models: ['ASX', 'Eclipse Cross', 'Lancer', 'Outlander', 'Pajero', 'Triton'] },
  { make: 'Nissan', models: ['Navara', 'Pathfinder', 'Patrol', 'Pulsar', 'Qashqai', 'X-TRAIL'] },
  { make: 'Peugeot', models: ['107', '206', '207', '208', '301', '306', '307', '308', '406', '407', '2008', '3008', '5008'] },
  { make: 'Subaru', models: ['BRZ', 'Forester', 'Impreza', 'Liberty', 'Outback', 'XV'] },
  { make: 'Suzuki', models: ['Baleno', 'Ignis', 'Jimny', 'Swift', 'Vitara'] },
  { make: 'Tesla', models: ['Model 3', 'Model S', 'Model X', 'Model Y'] },
  { make: 'Toyota', models: ['Camry', 'Corolla', 'HiAce', 'Hilux', 'Kluger', 'LandCruiser', 'Prius', 'RAV4', 'Yaris'] },
  { make: 'Volkswagen', models: ['Amarok', 'Golf', 'Passat', 'Polo', 'Tiguan', 'Touareg'] },
]

export function getModelsForMake(make: string) {
  return VEHICLE_CATALOG.find(option => option.make === make)?.models ?? []
}
