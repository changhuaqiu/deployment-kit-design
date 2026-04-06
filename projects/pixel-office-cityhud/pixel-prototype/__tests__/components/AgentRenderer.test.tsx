import { describe, expect, it } from 'vitest'
import { getSpriteFrame } from '../../src/utils/spriteData'

describe('AgentRenderer Sprite System', () => {
  describe('getSpriteFrame', () => {
    it('should return correct frame for idle state', () => {
      const frame = getSpriteFrame('idle', 0, 0)

      expect(frame).toBeDefined()
      expect(frame).toBeInstanceOf(Uint8ClampedArray)
      expect(frame.length).toBe(8 * 8 * 4) // 8x8 pixels, 4 channels (RGBA)
    })

    it('should return different frames for walking animation', () => {
      const frame0 = getSpriteFrame('walking', 0, 0)
      const frame1 = getSpriteFrame('walking', 1, 0)
      const frame2 = getSpriteFrame('walking', 2, 0)

      expect(frame0).toBeDefined()
      expect(frame1).toBeDefined()
      expect(frame2).toBeDefined()

      // Frames should be different for animation
      expect(frame0).not.toEqual(frame1)
      expect(frame1).not.toEqual(frame2)
    })

    it('should return correct frame for working state', () => {
      const frame = getSpriteFrame('working', 0, 0)

      expect(frame).toBeDefined()
      expect(frame).toBeInstanceOf(Uint8ClampedArray)
      expect(frame.length).toBe(8 * 8 * 4)
    })

    it('should apply different color palettes', () => {
      const palette0 = getSpriteFrame('idle', 0, 0)
      const palette1 = getSpriteFrame('idle', 0, 1)
      const palette2 = getSpriteFrame('idle', 0, 2)

      expect(palette0).toBeDefined()
      expect(palette1).toBeDefined()
      expect(palette2).toBeDefined()

      // Different palettes should produce different colors
      expect(palette0).not.toEqual(palette1)
      expect(palette1).not.toEqual(palette2)
    })
  })
})
