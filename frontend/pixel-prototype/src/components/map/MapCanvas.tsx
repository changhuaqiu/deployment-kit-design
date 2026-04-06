import { useEffect, useRef, useCallback } from 'react'
import type { Building, Connection, ZoomLevel, SelectionState, ViewportState } from '@/types/map'
import { getZoomScale } from '@/types/map'
import { mapToScreen, screenToMap, pointInRect } from '@/utils/mapCoordinates'
import { drawBuilding, drawConnection } from '@/utils/mapRendering'
import type { Agent } from '@/types/agents'

interface MapCanvasProps {
  buildings: Building[]
  agents: Agent[]
  connections: Connection[]
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  onBuildingClick: (buildingId: string) => void
  onAgentClick: (agentId: string) => void
  onViewportChange: (updates: Partial<ViewportState>) => void
  onZoomChange: (zoom: ZoomLevel) => void
}

export function MapCanvas({
  buildings,
  agents,
  connections,
  viewport,
  zoom,
  selection,
  onBuildingClick,
  onAgentClick,
  onViewportChange,
  onZoomChange
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    viewportStartX: number
    viewportStartY: number
    totalDistance: number
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    viewportStartX: 0,
    viewportStartY: 0,
    totalDistance: 0
  })

  const zoomScale = getZoomScale(zoom)

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid background
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.1)'
    ctx.lineWidth = 1
    const gridSize = 50 * zoomScale

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw connections
    connections.forEach((connection) => {
      const fromBuilding = buildings.find((b) => b.id === connection.from)
      const toBuilding = buildings.find((b) => b.id === connection.to)

      if (fromBuilding && toBuilding) {
        const fromScreen = mapToScreen(
          fromBuilding.position.x + fromBuilding.position.width / 2,
          fromBuilding.position.y + fromBuilding.position.height / 2,
          viewport,
          zoomScale
        )
        const toScreen = mapToScreen(
          toBuilding.position.x + toBuilding.position.width / 2,
          toBuilding.position.y + toBuilding.position.height / 2,
          viewport,
          zoomScale
        )

        drawConnection(ctx, fromScreen.x, fromScreen.y, toScreen.x, toScreen.y, connection.type)
      }
    })

    // Draw buildings
    buildings.forEach((building) => {
      const screenPos = mapToScreen(
        building.position.x,
        building.position.y,
        viewport,
        zoomScale
      )

      const width = building.position.width * zoomScale
      const height = building.position.height * zoomScale

      // Check if visible
      if (
        screenPos.x + width < 0 ||
        screenPos.x > canvas.width ||
        screenPos.y + height < 0 ||
        screenPos.y > canvas.height
      ) {
        return
      }

      // Draw selection highlight
      if (selection.type === 'building' && selection.id === building.id) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 4
        ctx.strokeRect(screenPos.x - 4, screenPos.y - 4, width + 8, height + 8)
      }

      drawBuilding(ctx, building, screenPos.x, screenPos.y, width, height, zoom)
    })

    // Draw agents
    agents.forEach((agent) => {
      const screenPos = mapToScreen(agent.position.x, agent.position.y, viewport, zoomScale)

      // Check if visible
      if (
        screenPos.x < 0 ||
        screenPos.x > canvas.width ||
        screenPos.y < 0 ||
        screenPos.y > canvas.height
      ) {
        return
      }

      // Draw agent
      const agentSize = 16 * zoomScale
      ctx.font = `${agentSize}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(agent.icon, screenPos.x, screenPos.y)

      // Draw selection highlight
      if (selection.type === 'agent' && selection.id === agent.id) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, agentSize / 2 + 4, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw speech bubble if present
      if (agent.bubble) {
        const bubbleWidth = 120
        const bubbleHeight = 40
        const bubbleX = screenPos.x + 20
        const bubbleY = screenPos.y - 20

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight)

        ctx.font = '12px Arial'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(agent.bubble.message, bubbleX + 8, bubbleY + 8)
      }
    })
  }, [buildings, agents, connections, viewport, zoom, zoomScale, selection])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const animate = () => {
      render()
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [render])

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      dragStateRef.current = {
        isDragging: true,
        startX: x,
        startY: y,
        viewportStartX: viewport.x,
        viewportStartY: viewport.y,
        totalDistance: 0
      }
    },
    [viewport]
  )

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragStateRef.current.isDragging) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const dx = x - dragStateRef.current.startX
      const dy = y - dragStateRef.current.startY

      dragStateRef.current.totalDistance += Math.sqrt(dx * dx + dy * dy)

      const newViewportX = dragStateRef.current.viewportStartX - dx / zoomScale
      const newViewportY = dragStateRef.current.viewportStartY - dy / zoomScale

      onViewportChange({ x: newViewportX, y: newViewportY })
    },
    [zoomScale, onViewportChange]
  )

  // Mouse up handler
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Check if this was a click (not a drag)
      const DRAG_THRESHOLD = 5
      if (dragStateRef.current.totalDistance < DRAG_THRESHOLD) {
        const mapPos = screenToMap(x, y, viewport, zoomScale)

        // Check building clicks
        for (const building of buildings) {
          if (pointInRect(mapPos, building.position)) {
            onBuildingClick(building.id)
            dragStateRef.current.isDragging = false
            return
          }
        }

        // Check agent clicks (within 20 pixels)
        const AGENT_CLICK_RADIUS = 20 / zoomScale
        for (const agent of agents) {
          const dx = agent.position.x - mapPos.x
          const dy = agent.position.y - mapPos.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < AGENT_CLICK_RADIUS) {
            onAgentClick(agent.id)
            dragStateRef.current.isDragging = false
            return
          }
        }
      }

      dragStateRef.current.isDragging = false
    },
    [buildings, agents, viewport, zoomScale, onBuildingClick, onAgentClick]
  )

  // Wheel handler for zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()

      const zoomLevels: ZoomLevel[] = ['world', 'environment', 'building']
      const currentIndex = zoomLevels.indexOf(zoom)

      if (e.deltaY < 0 && currentIndex < zoomLevels.length - 1) {
        onZoomChange(zoomLevels[currentIndex + 1])
      } else if (e.deltaY > 0 && currentIndex > 0) {
        onZoomChange(zoomLevels[currentIndex - 1])
      }
    },
    [zoom, onZoomChange]
  )

  // Setup canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const width = parent.clientWidth * 0.75
      const height = parent.clientHeight

      canvas.width = width
      canvas.height = height
    }

    updateSize()

    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
