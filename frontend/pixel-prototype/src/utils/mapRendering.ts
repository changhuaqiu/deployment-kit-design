import type { Building, Connection } from '@/types/map'
import { drawBuildingWithAnimation, drawConnectionWithFlow } from './mapAnimations'

export function districtsToBuildings(
  districts: Array<{
    id: string
    type: string
    city: string
    position?: { x: number; y: number; width: number; height: number }
    status: string
    metrics?: { resourceCount: number }
  }>
): Building[] {
  return districts.map((district) => ({
    id: district.id,
    type: district.type as Building['type'],
    name: district.type.toUpperCase(),
    city: district.city as 'test' | 'prod',
    position: district.position || {
      x: 100,
      y: 100,
      width: 120,
      height: 100
    },
    status: district.status as Building['status'],
    metrics: {
      resourceCount: district.metrics?.resourceCount || 0
    }
  }))
}

export function getBuildingColor(status: Building['status']): string {
  switch (status) {
    case 'healthy':
      return '#22c55e'
    case 'warning':
      return '#f59e0b'
    case 'error':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

export function getCityColor(city: 'test' | 'prod'): string {
  return city === 'test' ? '#3b82f6' : '#f97316'
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: string,
  time: number
): void {
  const statusColor = getBuildingColor(building.status)
  const cityColor = getCityColor(building.city)

  // Fill background
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x, y, width, height)

  // Draw border based on status
  ctx.strokeStyle = statusColor
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)

  // Draw city indicator (small colored box)
  ctx.fillStyle = cityColor
  ctx.fillRect(x + 4, y + 4, 8, 8)

  // Draw icon (bigger, more prominent)
  const icon = getBuildingIcon(building.type)
  const iconSize = Math.max(24, width / 3.5) // Scaled down icon to fit better
  ctx.font = `${iconSize}px "Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", sans-serif` // System emoji font for clearer rendering
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, x + width / 2, y + height / 2 - 10) // Centered with offset for text

  // Draw name (smaller text below icon)
  const textSize = Math.max(10, width / 12) // Slightly larger, readable text
  ctx.font = `bold ${textSize}px "Courier New", monospace`
  ctx.fillStyle = '#e2e8f0' // Brighter white/gray for better contrast
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  // Truncate name if too long
  const displayName = building.name.length > 15 ? building.name.substring(0, 13) + '..' : building.name
  ctx.fillText(displayName, x + width / 2, y + height - 12)

  // Draw animation overlay
  drawBuildingWithAnimation(ctx, building, x, y, width, height, time)
}

function getBuildingIcon(type: Building['type']): string {
  switch (type) {
    case 'compute':
      return '🏗️'
    case 'data':
      return '🏦'
    case 'network':
      return '🌐'
    case 'config':
      return '⚙️'
    default:
      return '🏢'
  }
}

export function drawConnection(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: Connection['type'],
  time: number,
  zoomScale: number = 1.0
): void {
  // Use the new flow animation function
  drawConnectionWithFlow(
    ctx,
    { from: '', to: '', type }, // Connection metadata (from/to IDs not needed for rendering)
    fromX,
    fromY,
    toX,
    toY,
    time,
    zoomScale
  )
}
