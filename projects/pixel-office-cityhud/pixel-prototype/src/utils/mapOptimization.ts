import type { Building } from '@/types/map'
import type { ViewportState, ZoomLevel } from '@/types/map'

export function cullBuildingsToViewport(
  buildings: Building[],
  viewport: ViewportState,
  zoom: ZoomLevel,
  canvasWidth: number,
  canvasHeight: number
): Building[] {
  const zoomScale = zoom === 'world' ? 0.5 : zoom === 'environment' ? 1.0 : 2.0

  // Calculate viewport bounds in map coordinates
  const topLeftX = viewport.x
  const topLeftY = viewport.y
  const bottomRightX = viewport.x + canvasWidth / zoomScale
  const bottomRightY = viewport.y + canvasHeight / zoomScale

  return buildings.filter(b => {
    return !(
      b.position.x + b.position.width < topLeftX ||
      b.position.x > bottomRightX ||
      b.position.y + b.position.height < topLeftY ||
      b.position.y > bottomRightY
    )
  })
}
