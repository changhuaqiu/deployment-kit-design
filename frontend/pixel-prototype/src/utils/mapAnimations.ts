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

export function drawConnectionWithFlow(
  ctx: CanvasRenderingContext2D,
  connection: { from: string; to: string; type: 'dependency' | 'dataflow' },
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number
): void {
  // Draw base connection line
  ctx.beginPath()
  ctx.strokeStyle = connection.type === 'dependency' ? '#6b7280' : '#3b82f6'
  ctx.lineWidth = 2
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // Don't show particles at world zoom level
  const zoomScale = 1.0  // Would be passed as parameter
  if (zoomScale < 0.8) return

  // Calculate particle position
  const speed = connection.type === 'dataflow' ? 0.002 : 0.0005
  const progress = (time * speed) % 1

  const particleX = fromX + (toX - fromX) * progress
  const particleY = fromY + (toY - fromY) * progress

  // Draw particle
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow' ? '#3b82f6' : '#8b5cf6'
  ctx.arc(particleX, particleY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Draw particle glow
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.3)'
  ctx.arc(particleX, particleY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}