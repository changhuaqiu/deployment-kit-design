import type { ViewportState, ZoomLevel } from '@/types/map'
import type { Building } from '@/types/map'

export interface ViewportStateWithZoom extends ViewportState {
  zoom: ZoomLevel
}

export interface BuildingAnimation {
  type: 'pulse' | 'blink'
  color: string
  alpha: number
}

export function getBuildingAnimation(
  status: Building['status'],
  time: number
): BuildingAnimation {
  switch (status) {
    case 'healthy':
      return {
        type: 'pulse',
        color: '#10b981',
        alpha: 0.3 + Math.sin(time / 300) * 0.15
      }

    case 'warning':
      return {
        type: 'blink',
        color: '#f59e0b',
        alpha: Math.sin(time / 500) > 0 ? 0.8 : 0.2
      }

    case 'error':
      return {
        type: 'blink',
        color: '#ef4444',
        alpha: Math.sin(time / 250) > 0 ? 1.0 : 0.3
      }

    default:
      return { type: 'pulse', color: '#6b7280', alpha: 0 }
  }
}

export function drawBuildingWithAnimation(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number
) {
  const anim = getBuildingAnimation(building.status, time)

  if (anim.type === 'pulse') {
    ctx.save()
    ctx.fillStyle = anim.color
    ctx.globalAlpha = anim.alpha
    ctx.fillRect(x, y, width, height)
    ctx.restore()
  }

  if (anim.type === 'blink') {
    ctx.save()
    ctx.strokeStyle = anim.color
    ctx.lineWidth = 3
    ctx.globalAlpha = anim.alpha
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
    ctx.restore()
  }
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