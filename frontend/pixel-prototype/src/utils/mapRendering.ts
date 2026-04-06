import type { Building, Connection } from '@/types/map'
import { drawBuildingWithAnimation } from './mapAnimations'

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

  // Draw icon
  const icon = getBuildingIcon(building.type)
  ctx.font = `${Math.max(16, width / 4)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText(icon, x + width / 2, y + height / 2)

  // Draw name
  ctx.font = `${Math.max(10, width / 6)}px Arial`
  ctx.fillStyle = '#fff'
  ctx.fillText(building.name, x + width / 2, y + height - 8)

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
  type: Connection['type']
): void {
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)

  if (type === 'dependency') {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.setLineDash([5, 5])
  } else {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
    ctx.setLineDash([])
  }

  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])
}
