import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public/icons/logo.svg'))

const icons = [
  { name: 'icon-192.png',          size: 192, padding: 0 },
  { name: 'icon-512.png',          size: 512, padding: 0 },
  { name: 'icon-512-maskable.png', size: 512, padding: 40 },
  { name: 'apple-touch-icon.png',  size: 180, padding: 0 },
]

for (const { name, size, padding } of icons) {
  const inner = size - padding * 2
  await sharp(svg)
    .resize(inner, inner)
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#0a0a0a' })
    .png()
    .toFile(join(root, 'public/icons', name))
  console.log(`✅ ${name}`)
}
