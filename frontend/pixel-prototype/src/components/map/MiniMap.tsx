import { useRef, useEffect } from 'react'
import type { Building } from '@/types/map'
import type { ViewportState, ZoomLevel } from '@/store/mapStore'
import { getZoomScale } from '@/types/map'

interface MiniMapProps {
  buildings: Building[]
  viewport: ViewportState
  zoom: ZoomLevel
  width?: number
  height?: number
}

export function MiniMap({ buildings, viewport, zoom, width = 200, height = 150 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate scale to fit all buildings
    const padding = 10
    const scaleX = (width - padding * 2) / 1000
    const scaleY = (height - padding * 2) / 600
    const scale = Math.min(scaleX, scaleY)

    // Draw buildings
    buildings.forEach(building => {
      const x = building.position.x * scale + padding
      const y = building.position.y * scale + padding
      const w = building.position.width * scale
      const h = building.position.height * scale

      ctx.fillStyle = getBuildingColor(building.status)
      ctx.fillRect(x, y, w, h)
    })

    // Draw viewport rectangle
    const viewportX = viewport.x * scale + padding
    const viewportY = viewport.y * scale + padding
    const viewportW = viewport.width / getZoomScale(zoom) * scale
    const viewportH = viewport.height / getZoomScale(zoom) * scale

    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 2
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

  }, [buildings, viewport, zoom, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="mini-map"
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #8b5cf6',
        borderRadius: '4px'
      }}
    />
  )
}

function getBuildingColor(status: Building['status']): string {
  switch (status) {
    case 'healthy': return '#10b981'
    case 'warning': return '#f59e0b'
    case 'error': return '#ef4444'
    default: return '#6b7280'
  }
}