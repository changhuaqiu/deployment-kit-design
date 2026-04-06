import { describe, expect, it } from 'vitest'
import { defaultDistrictRects, placeInDistrict } from './cityPlacement'

describe('cityPlacement', () => {
  it('places deterministically for same seedKey', () => {
    const rects = defaultDistrictRects()
    const p1 = placeInDistrict({ occupied: new Set(), rects, district: 'data', seedKey: 'a:b:c' })
    const p2 = placeInDistrict({ occupied: new Set(), rects, district: 'data', seedKey: 'a:b:c' })
    expect(p1).toEqual(p2)
  })

  it('avoids occupied spots', () => {
    const rects = defaultDistrictRects()
    const occupied = new Set<string>()
    const p1 = placeInDistrict({ occupied, rects, district: 'business', seedKey: 'x' })
    const p2 = placeInDistrict({ occupied, rects, district: 'business', seedKey: 'x' })
    expect(p1).not.toEqual(p2)
  })
})

