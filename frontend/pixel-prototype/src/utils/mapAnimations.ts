import type { ViewportState, ZoomLevel } from '@/types/map'

export interface ViewportStateWithZoom extends ViewportState {
  zoom: ZoomLevel
}

export function getNextZoomScale(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'world': return 0.5
    case 'environment': return 1.0
    case 'building': return 2.0
  }
}

export interface ZoomAnimation {
  fromScale: number
  toScale: number
  startTime: number
  duration: number
  centerX: number
  centerY: number
}

let currentAnimation: ZoomAnimation | null = null

export function animateZoomTransition(
  currentViewport: ViewportStateWithZoom,
  targetZoom: ZoomLevel,
  duration: number = 2000
): (time: number, onUpdate: (viewport: ViewportState) => void) => boolean {
  const fromScale = getNextZoomScale(currentViewport.zoom)
  const toScale = getNextZoomScale(targetZoom)

  currentAnimation = {
    fromScale,
    toScale,
    startTime: performance.now(),
    duration,
    centerX: currentViewport.x + currentViewport.width / 2,
    centerY: currentViewport.y + currentViewport.height / 2
  }

  return (time: number, onUpdate: (viewport: ViewportState) => void) => {
    const elapsed = time - currentAnimation!.startTime
    const progress = Math.min(elapsed / duration, 1.0)

    // Ease-out-cubic
    const eased = 1 - Math.pow(1 - progress, 3)

    const currentScale = fromScale + (toScale - fromScale) * eased

    // Update viewport with interpolated scale
    // Note: This is simplified - just update zoom at end
    onUpdate({
      ...currentViewport,
      zoom: progress >= 1.0 ? targetZoom : currentViewport.zoom
    } as ViewportState)

    return progress < 1.0  // Return true to continue, false when complete
  }
}

export function cancelCurrentAnimation(): void {
  currentAnimation = null
}