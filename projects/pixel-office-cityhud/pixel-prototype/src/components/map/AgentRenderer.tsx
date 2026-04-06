import { mapToScreen } from '@/utils/mapCoordinates'
import type { WorkerAgent } from '@/store/agents'
import type { ViewportState, ZoomLevel } from '@/store/mapStore'
import { getZoomScale } from '@/types/map'

interface AgentRendererProps {
  agent: WorkerAgent
  viewport: ViewportState
  zoom: ZoomLevel
  onClick?: (agentId: string) => void
}

export function AgentRenderer({ agent, viewport, zoom, onClick }: AgentRendererProps) {
  if (!agent.position) return null

  const zoomScale = getZoomScale(zoom)
  const screenPos = mapToScreen(
    agent.position.mapX,
    agent.position.mapY,
    viewport,
    zoomScale
  )

  const size = zoom === 'building' ? 48 : zoom === 'environment' ? 32 : 20

  const handleClick = () => {
    onClick?.(agent.id)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        fontSize: `${size * 0.8}px`,
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
        opacity: agent.status === 'done' ? 0.6 : 1.0,
        filter: agent.status === 'working' ? 'drop-shadow(0 0 8px #8b5cf6)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      {agent.icon}
    </div>
  )
}