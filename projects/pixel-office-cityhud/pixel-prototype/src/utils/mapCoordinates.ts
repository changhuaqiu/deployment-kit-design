import type { ViewportState } from '@/types/map'

export interface Point {
  x: number
  y: number
}

export function mapToScreen(
  mapX: number,
  mapY: number,
  viewport: ViewportState,
  zoomScale: number
): Point {
  return {
    x: (mapX - viewport.x) * zoomScale,
    y: (mapY - viewport.y) * zoomScale
  }
}

export function screenToMap(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  zoomScale: number
): Point {
  return {
    x: screenX / zoomScale + viewport.x,
    y: screenY / zoomScale + viewport.y
  }
}

export function pointInRect(
  point: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}
