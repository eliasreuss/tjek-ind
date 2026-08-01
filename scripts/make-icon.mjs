/**
 * Renders public/apple-touch-icon.png from the same shapes as public/icon.svg.
 * Dependency-free: draws into a raw RGBA buffer with 3x supersampling and
 * encodes a PNG with zlib. Run with `npm run icon` after changing the artwork.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SIZE = 180
const SS = 3 // supersampling factor
const N = SIZE * SS

const AMBER = [243, 193, 75]
const INK = [56, 42, 32]
const CREAM = [246, 241, 232]
const SAGE = [143, 176, 105]

const s = (v) => (v / 128) * N // scale from the 128-unit SVG viewBox

const inRoundedRect = (x, y, w, h, r) =>
  x >= 0 && y >= 0 && x <= w && y <= h &&
  (Math.min(x, w - x) >= r ||
    Math.min(y, h - y) >= r ||
    Math.hypot(Math.min(x, w - x) - r, Math.min(y, h - y) - r) <= r)

const inRing = (d, radius, width) => Math.abs(d - radius) <= width / 2

function inTick(x, y, cx, cy, angle, inner, outer, halfWidth) {
  const dx = x - cx
  const dy = y - cy
  const along = dx * Math.cos(angle) + dy * Math.sin(angle)
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle)
  return along >= inner && along <= outer && Math.abs(across) <= halfWidth
}

const acc = new Float64Array(SIZE * SIZE * 4)
const c = s(64)

for (let py = 0; py < N; py++) {
  for (let px = 0; px < N; px++) {
    const x = px + 0.5
    const y = py + 0.5
    let color = null

    if (inRoundedRect(x, y, N, N, s(30))) {
      color = AMBER
      const d = Math.hypot(x - c, y - c)
      if (inRing(d, s(40), s(17))) color = INK
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 2
        if (inTick(x, y, c, c, a, s(32), s(41), s(1.7))) color = CREAM
      }
      if (d <= s(23)) color = SAGE
    }

    if (!color) continue
    const o = (Math.floor(py / SS) * SIZE + Math.floor(px / SS)) * 4
    acc[o] += color[0]
    acc[o + 1] += color[1]
    acc[o + 2] += color[2]
    acc[o + 3] += 255
  }
}

const samples = SS * SS
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // filter type: none
  for (let x = 0; x < SIZE; x++) {
    const o = (y * SIZE + x) * 4
    const alpha = acc[o + 3] / samples
    const cover = alpha / 255 || 1
    const dst = y * (SIZE * 4 + 1) + 1 + x * 4
    raw[dst] = Math.round(acc[o] / samples / cover)
    raw[dst + 1] = Math.round(acc[o + 1] / samples / cover)
    raw[dst + 2] = Math.round(acc[o + 2] / samples / cover)
    raw[dst + 3] = Math.round(alpha)
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'apple-touch-icon.png')
writeFileSync(out, png)
console.log(`wrote ${out} (${png.length} bytes)`)
