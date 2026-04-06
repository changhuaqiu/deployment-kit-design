import { useEffect, useRef, useCallback, useState } from 'react'
import type { Building, Connection, ZoomLevel, SelectionState, ViewportState, HoverState } from '@/types/map'
import { getZoomScale } from '@/types/map'
import { mapToScreen, screenToMap, pointInRect } from '@/utils/mapCoordinates'
import { drawBuilding, drawConnection } from '@/utils/mapRendering'
import { calculateAgentPath } from '@/utils/agentPathfinding'
import type { Agent } from '@/types/agents'
import type { WorkerAgent } from '@/store/agents'
import { AgentRenderer } from './AgentRenderer'

interface MapCanvasProps {
  buildings: Building[]
  agents: Agent[]
  workerAgents: WorkerAgent[]
  connections: Connection[]
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  hovered: HoverState
  onBuildingClick: (buildingId: string) => void
  onAgentClick: (agentId: string) => void
  onViewportChange: (updates: Partial<ViewportState>) => void
  onZoomChange: (zoom: ZoomLevel) => void
  onHoverChange: (hovered: HoverState) => void
  onMousePositionChange?: (position: { x: number; y: number }) => void
}

export function MapCanvas({
  buildings,
  agents,
  workerAgents,
  connections,
  viewport,
  zoom,
  selection,
  hovered,
  onBuildingClick,
  onAgentClick,
  onViewportChange,
  onZoomChange,
  onHoverChange
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
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

  // Hit detection for hover
  const detectHover = (clientX: number, clientY: number): HoverState => {
    const canvas = canvasRef.current
    if (!canvas) return { type: null, id: null }

    const rect = canvas.getBoundingClientRect()
    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top

    // Convert to map coordinates
    const mapX = (mouseX + viewport.x) / zoomScale
    const mapY = (mouseY + viewport.y) / zoomScale

    // Hit detection for buildings
    for (const building of buildings) {
      if (pointInRect({ x: mapX, y: mapY }, building.position)) {
        return { type: 'building', id: building.id }
      }
    }

    // Hit detection for agents
    for (const agent of agents) {
      if (!agent.position) continue
      const agentScreenX = (agent.position.x - viewport.x) * zoomScale
      const agentScreenY = (agent.position.y - viewport.y) * zoomScale
      const dist = Math.sqrt(Math.pow(mouseX - agentScreenX, 2) + Math.pow(mouseY - agentScreenY, 2))
      if (dist < 20) {
        return { type: 'agent', id: agent.id }
      }
    }

    return { type: null, id: null }
  }

  // Render agent paths
  const renderAgentPaths = (ctx: CanvasRenderingContext2D) => {
    agents.forEach((agent) => {
      // Only draw paths for agents with target and walking status
      if (!agent.target || agent.state !== 'walking') return

      // Find the target building
      const targetBuilding = buildings.find((b) => b.id === agent.target?.buildingId)
      if (!targetBuilding) return

      // Calculate path
      const path = calculateAgentPath(
        { position: { mapX: agent.position.x, mapY: agent.position.y } },
        targetBuilding,
        buildings
      )

      if (path.length < 2) return

      // Draw path line
      ctx.beginPath()
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      path.forEach((point, index) => {
        const screen = mapToScreen(point.x, point.y, viewport, zoomScale)
        if (index === 0) ctx.moveTo(screen.x, screen.y)
        else ctx.lineTo(screen.x, screen.y)
      })

      ctx.stroke()
      ctx.setLineDash([])

      // Draw end marker
      const lastPoint = path[path.length - 1]
      const endScreen = mapToScreen(lastPoint.x, lastPoint.y, viewport, zoomScale)
      ctx.beginPath()
      ctx.fillStyle = '#8b5cf6'
      ctx.arc(endScreen.x, endScreen.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }

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

      // Draw hover highlight
      if (hovered.type === 'building' && hovered.id === building.id) {
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 3
        ctx.strokeRect(screenPos.x - 2, screenPos.y - 2, width + 4, height + 4)
      }

      // Draw selection highlight
      if (selection.type === 'building' && selection.id === building.id) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 4
        ctx.strokeRect(screenPos.x - 4, screenPos.y - 4, width + 8, height + 8)
      }

      drawBuilding(ctx, building, screenPos.x, screenPos.y, width, height, zoom)
    })

    // Draw agent paths
    renderAgentPaths(ctx)

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

      // Draw hover highlight
      if (hovered.type === 'agent' && hovered.id === agent.id) {
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(screenPos.x, screenPos.y, agentSize / 2 + 3, 0, Math.PI * 2)
        ctx.stroke()
      }

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
  }, [buildings, agents, connections, viewport, zoom, zoomScale, selection, hovered])

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
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMousePosition({ x: e.clientX, y: e.clientY })

      if (!dragStateRef.current.isDragging) {
        // Perform hover detection when not dragging
        const hoverState = detectHover(e.clientX, e.clientY)
        if (hoverState.type !== hovered.type || hoverState.id !== hovered.id) {
          onHoverChange(hoverState)
        }
        return
      }

      const dx = x - dragStateRef.current.startX
      const dy = y - dragStateRef.current.startY

      dragStateRef.current.totalDistance += Math.sqrt(dx * dx + dy * dy)

      const newViewportX = dragStateRef.current.viewportStartX - dx / zoomScale
      const newViewportY = dragStateRef.current.viewportStartY - dy / zoomScale

      onViewportChange({ x: newViewportX, y: newViewportY })
    },
    [zoomScale, onViewportChange, hovered, onHoverChange]
  )

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    if (hovered.type !== null || hovered.id !== null) {
      onHoverChange({ type: null, id: null })
    }
    // Also handle drag state
    dragStateRef.current.isDragging = false
  }, [hovered, onHoverChange])

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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: hovered.type ? 'pointer' : 'default'
        }}
      />

      {/* Render agents as DOM overlays */}
      {workerAgents.map(agent => (
        <AgentRenderer
          key={agent.id}
          agent={agent}
          viewport={viewport}
          zoom={zoom}
          onClick={onAgentClick}
        />
      ))}
    </div>
  )
}
