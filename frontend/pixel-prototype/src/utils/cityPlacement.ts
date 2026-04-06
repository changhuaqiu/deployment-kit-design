import type { DistrictKey } from '@/utils/city'

export type DistrictRect = { key: DistrictKey; x: number; y: number; w: number; h: number }

export function hashInt(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function findOpenSpot(occupied: Set<string>, rect: DistrictRect, seed: number) {
  const stride = 2
  const maxX = rect.x + rect.w - 2
  const maxY = rect.y + rect.h - 2
  let x = rect.x + 1 + ((seed % Math.max(1, rect.w - 2)) & ~1)
  let y = rect.y + 1 + (((seed >>> 6) % Math.max(1, rect.h - 2)) & ~1)

  for (let i = 0; i < 256; i++) {
    const key = `${x},${y}`
    if (!occupied.has(key)) {
      occupied.add(key)
      return { x, y }
    }
    x += stride
    if (x > maxX) {
      x = rect.x + 1
      y += stride
      if (y > maxY) y = rect.y + 1
    }
  }

  const fallback = `${rect.x + 1},${rect.y + 1}`
  occupied.add(fallback)
  return { x: rect.x + 1, y: rect.y + 1 }
}

export function defaultDistrictRects(): DistrictRect[] {
  return [
    { key: 'business', x: 2, y: 2, w: 18, h: 12 },
    { key: 'data', x: 22, y: 2, w: 18, h: 12 },
    { key: 'network', x: 42, y: 2, w: 12, h: 12 },
    { key: 'security', x: 2, y: 16, w: 16, h: 16 },
    { key: 'ops', x: 20, y: 16, w: 16, h: 16 },
    { key: 'config', x: 38, y: 16, w: 16, h: 16 },
  ]
}

export function placeInDistrict(opts: {
  occupied: Set<string>
  rects: DistrictRect[]
  district: DistrictKey
  seedKey: string
}) {
  const rect = opts.rects.find((r) => r.key === opts.district) ?? opts.rects[0]
  return findOpenSpot(opts.occupied, rect, hashInt(opts.seedKey))
}

