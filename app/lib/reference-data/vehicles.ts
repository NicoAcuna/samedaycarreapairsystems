export type VehicleCatalogOption = {
  make: string
  models: string[]
}

export const VEHICLE_CATALOG: VehicleCatalogOption[] = [
  { make: 'Alfa Romeo', models: ['147', '156', '159', 'Giulia', 'Giulietta', 'Stelvio'] },
  { make: 'Audi', models: ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT'] },
  { make: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4'] },
  { make: 'BYD', models: ['Atto 3', 'Dolphin', 'Seal', 'Shark'] },
  { make: 'Chevrolet', models: ['Camaro', 'Corvette', 'Silverado', 'Tahoe', 'Traverse'] },
  { make: 'Chery', models: ['Omoda 5', 'Tiggo 4', 'Tiggo 7', 'Tiggo 8'] },
  { make: 'Chrysler', models: ['300', '300C', 'Grand Voyager', 'Voyager'] },
  { make: 'Citroen', models: ['C1', 'C2', 'C3', 'C4', 'C5', 'C5 Aircross', 'Berlingo', 'Picasso'] },
  { make: 'Dodge', models: ['Challenger', 'Charger', 'Durango', 'Journey', 'RAM 1500'] },
  { make: 'Ferrari', models: ['296', '488', '812', 'California', 'F8', 'Roma', 'SF90'] },
  { make: 'Fiat', models: ['124 Spider', '500', '500X', 'Bravo', 'Ducato', 'Punto', 'Tipo'] },
  { make: 'Ford', models: ['Bronco', 'Endura', 'Escape', 'Everest', 'Explorer', 'F-150', 'Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Puma', 'Ranger', 'Territory', 'Transit'] },
  { make: 'GWM', models: ['Cannon', 'Haval H6', 'Haval Jolion', 'Ora', 'Tank 300'] },
  { make: 'Holden', models: ['Astra', 'Barina', 'Captiva', 'Colorado', 'Commodore', 'Cruze', 'Equinox', 'Spark', 'Trailblazer', 'Trax'] },
  { make: 'Honda', models: ['Accord', 'City', 'Civic', 'CR-V', 'HR-V', 'Jazz', 'Legend', 'Odyssey', 'Pilot', 'ZR-V'] },
  { make: 'Hyundai', models: ['Accent', 'Elantra', 'Getz', 'i20', 'i30', 'i40', 'i45', 'IONIQ 5', 'IONIQ 6', 'ix35', 'Kona', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Staria', 'Tucson', 'Venue'] },
  { make: 'Infiniti', models: ['Q50', 'Q60', 'QX50', 'QX60', 'QX80'] },
  { make: 'Isuzu', models: ['D-MAX', 'MU-X'] },
  { make: 'Jaguar', models: ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF', 'XJ'] },
  { make: 'Jeep', models: ['Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Patriot', 'Renegade', 'Wrangler'] },
  { make: 'Kia', models: ['Carnival', 'Cerato', 'EV6', 'Niro', 'Picanto', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Telluride'] },
  { make: 'Land Rover', models: ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'] },
  { make: 'Lexus', models: ['CT', 'ES', 'GX', 'IS', 'LX', 'NX', 'RX', 'UX'] },
  { make: 'LDV', models: ['D90', 'Deliver 9', 'G10', 'T60', 'V80'] },
  { make: 'Maserati', models: ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'Quattroporte'] },
  { make: 'Mazda', models: ['BT-50', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6', 'MX-5'] },
  { make: 'Mercedes-Benz', models: ['A-Class', 'B-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'Sprinter', 'V-Class'] },
  { make: 'MG', models: ['3', 'HS', 'MG4', 'ZS', 'ZST'] },
  { make: 'Mini', models: ['Clubman', 'Convertible', 'Cooper', 'Countryman', 'Paceman'] },
  { make: 'Mitsubishi', models: ['ASX', 'Eclipse Cross', 'Express', 'Lancer', 'Outlander', 'Pajero', 'Pajero Sport', 'Triton'] },
  { make: 'Nissan', models: ['370Z', 'Juke', 'Leaf', 'Navara', 'Pathfinder', 'Patrol', 'Pulsar', 'Qashqai', 'X-TRAIL'] },
  { make: 'Peugeot', models: ['107', '206', '207', '208', '2008', '301', '306', '307', '308', '3008', '406', '407', '4008', '5008', '508'] },
  { make: 'Porsche', models: ['718', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { make: 'RAM', models: ['1500', '2500', '3500'] },
  { make: 'Renault', models: ['Arkana', 'Captur', 'Clio', 'Koleos', 'Megane', 'Trafic', 'Zoe'] },
  { make: 'Skoda', models: ['Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Superb'] },
  { make: 'Subaru', models: ['BRZ', 'Forester', 'Impreza', 'Liberty', 'Outback', 'Solterra', 'WRX', 'XV'] },
  { make: 'Suzuki', models: ['Baleno', 'Ignis', 'Jimny', 'S-Cross', 'Swift', 'Vitara'] },
  { make: 'Tesla', models: ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'] },
  { make: 'Toyota', models: ['86', 'Camry', 'C-HR', 'Corolla', 'Corolla Cross', 'FJ Cruiser', 'GR Supra', 'HiAce', 'Highlander', 'Hilux', 'Kluger', 'LandCruiser', 'LandCruiser 70', 'LandCruiser 200', 'LandCruiser 300', 'Prado', 'Prius', 'RAV4', 'Tarago', 'Yaris', 'Yaris Cross'] },
  { make: 'Volkswagen', models: ['Amarok', 'Arteon', 'Caddy', 'Golf', 'ID.4', 'Multivan', 'Passat', 'Polo', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'Transporter'] },
  { make: 'Volvo', models: ['C40', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'] },
]

export function getModelsForMake(make: string) {
  return VEHICLE_CATALOG.find(option => option.make === make)?.models ?? []
}
