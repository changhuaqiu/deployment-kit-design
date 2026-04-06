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
  const iconSize = Math.max(32, width / 2) // Much bigger icon
  ctx.font = `${iconSize}px "Press Start 2P", "Courier New", monospace` // Pixel font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, x + width / 2, y + height / 2 - 5) // Slightly above center

  // Draw name (smaller text below icon)
  const textSize = Math.max(8, width / 10) // Smaller text
  ctx.font = `${textSize}px "Press Start 2P", "Courier New", monospace`
  ctx.fillStyle = '#94a3b8' // Lighter gray for less prominence
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  // Truncate name if too long
  const displayName = building.name.length > 12 ? building.name.substring(0, 10) + '..' : building.name
  ctx.fillText(displayName, x + width / 2, y + height - 6)

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
