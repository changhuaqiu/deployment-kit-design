/**
 * Pixel Sprite Data and Rendering Functions
 *
 * Provides 8x8 pixel art sprites for agent rendering with:
 * - Multiple animation states (idle, walking, working)
 * - Color palette system for visual variety
 * - Canvas rendering utilities
 */

export const SPRITE_SIZE = 8

// Animation frame constants
export const IDLE_FRAME = 0
export const WALKING_FRAMES = 4 // Frames 0-3 for walking animation
export const WORKING_FRAMES = 2 // Frames 0-1 for working animation

/**
 * Color palettes for agents (RGB values)
 * Each palette has: [primary, secondary, skin, accent]
 */
export const PALETTES = [
  // Palette 0: Blue agent
  {
    primary: [59, 130, 246],    // Blue
    secondary: [30, 58, 138],   // Dark blue
    skin: [255, 220, 180],      // Light skin
    accent: [251, 191, 36]      // Yellow accent
  },
  // Palette 1: Green agent
  {
    primary: [34, 197, 94],     // Green
    secondary: [22, 101, 52],   // Dark green
    skin: [255, 220, 180],      // Light skin
    accent: [251, 191, 36]      // Yellow accent
  },
  // Palette 2: Purple agent
  {
    primary: [168, 85, 247],    // Purple
    secondary: [107, 33, 168],  // Dark purple
    skin: [255, 220, 180],      // Light skin
    accent: [251, 191, 36]      // Yellow accent
  }
]

/**
 * 8x8 pixel sprite data for different animation states
 * 0 = transparent, 1 = primary, 2 = secondary, 3 = skin, 4 = accent
 */
const SPRITE_DATA: Record<string, number[][][]> = {
  idle: [
    // Single frame for idle
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,0,0,0,0,0,0,1]
    ]
  ],
  walking: [
    // Frame 0: Standing
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,0,0,0,0,0,0,1]
    ],
    // Frame 1: Right leg forward
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,0,0,0,0,1,0,0]
    ],
    // Frame 2: Legs apart
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [0,1,0,0,0,0,1,0]
    ],
    // Frame 3: Left leg forward
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [0,0,1,0,0,0,0,1]
    ]
  ],
  working: [
    // Frame 0: Arms up
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,4,4,1,1,0],
      [1,0,0,0,0,0,0,1]
    ],
    // Frame 1: Arms down
    [
      [0,0,0,1,1,0,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,1,3,3,1,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,2,1,1,2,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,0,0,0,0,0,0,1]
    ]
  ]
}

/**
 * Get a sprite frame as RGBA pixel data
 * @param state - Animation state ('idle', 'walking', 'working')
 * @param frame - Frame index within the animation
 * @param paletteIndex - Color palette index (0-2)
 * @returns Uint8ClampedArray of pixel data (8x8x4 = 256 values)
 */
export function getSpriteFrame(
  state: 'idle' | 'walking' | 'working',
  frame: number,
  paletteIndex: number
): Uint8ClampedArray {
  const palette = PALETTES[paletteIndex % PALETTES.length]
  const frames = SPRITE_DATA[state]
  const frameData = frames[frame % frames.length]

  const pixels = new Uint8ClampedArray(SPRITE_SIZE * SPRITE_SIZE * 4)

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const colorIndex = frameData[y][x]
      const i = (y * SPRITE_SIZE + x) * 4

      if (colorIndex === 0) {
        // Transparent
        pixels[i] = 0
        pixels[i + 1] = 0
        pixels[i + 2] = 0
        pixels[i + 3] = 0
      } else {
        let color: number[]
        switch (colorIndex) {
          case 1:
            color = palette.primary
            break
          case 2:
            color = palette.secondary
            break
          case 3:
            color = palette.skin
            break
          case 4:
            color = palette.accent
            break
          default:
            color = palette.primary
        }

        pixels[i] = color[0]
        pixels[i + 1] = color[1]
        pixels[i + 2] = color[2]
        pixels[i + 3] = 255 // Full opacity
      }
    }
  }

  return pixels
}

/**
 * Draw a sprite on a canvas context
 * @param ctx - Canvas 2D rendering context
 * @param x - X position to draw at
 * @param y - Y position to draw at
 * @param state - Animation state
 * @param frame - Frame index
 * @param paletteIndex - Color palette index
 * @param scale - Scale factor (default: 4)
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: 'idle' | 'walking' | 'working',
  frame: number,
  paletteIndex: number,
  scale: number = 4
): void {
  const pixels = getSpriteFrame(state, frame, paletteIndex)
  const imageData = new ImageData(pixels, SPRITE_SIZE, SPRITE_SIZE)

  // Create a temporary canvas to scale the sprite
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = SPRITE_SIZE * scale
  tempCanvas.height = SPRITE_SIZE * scale
  const tempCtx = tempCanvas.getContext('2d')

  if (!tempCtx) return

  // Draw the sprite data to the temp canvas
  tempCtx.putImageData(imageData, 0, 0)

  // Draw scaled sprite to the main canvas
  ctx.drawImage(tempCanvas, x, y)
}
