import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agents'
import { drawSprite } from '@/utils/spriteData'
import type { Agent } from '@/types/agents'

interface AgentRendererProps {
  width: number
  height: number
}

/**
 * Canvas-based renderer for pixel art agents
 * Renders agents with animation frames and speech bubbles
 */
export default function AgentRenderer({ width, height }: AgentRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const agents = useAgentStore((state) => state.agents)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Animation loop
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Render each agent
      Object.values(agents).forEach((agent) => {
        renderAgent(ctx, agent)
      })

      // Continue animation loop
      animationRef.current = requestAnimationFrame(render)
    }

    // Start animation loop
    animationRef.current = requestAnimationFrame(render)

    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [agents, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width, height }}
    />
  )
}

/**
 * Render a single agent
 */
function renderAgent(ctx: CanvasRenderingContext2D, agent: Agent) {
  const { x, y } = agent.position
  const scale = 4 // Scale up 8x8 sprite to 32x32
  const spriteSize = 8 * scale

  // Determine animation state
  let animState: 'idle' | 'walking' | 'working' = 'idle'
  if (agent.state === 'walking' || agent.state === 'returning') {
    animState = 'walking'
  } else if (agent.state === 'working') {
    animState = 'working'
  }

  // Draw the sprite
  drawSprite(ctx, x - spriteSize / 2, y - spriteSize / 2, animState, agent.frame, agent.palette, scale)

  // Draw speech bubble if present
  if (agent.bubble) {
    drawSpeechBubble(ctx, x, y - spriteSize / 2 - 10, agent.bubble)
  }
}

/**
 * Draw a speech bubble above an agent
 */
function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bubble: Agent['bubble']
) {
  if (!bubble) return

  const padding = 8
  const fontSize = 10
  ctx.font = `${fontSize}px monospace`

  // Measure text
  const metrics = ctx.measureText(bubble.message)
  const textWidth = metrics.width
  const bubbleWidth = textWidth + padding * 2
  const bubbleHeight = fontSize + padding * 2

  // Set bubble color based on type
  let bgColor = 'rgba(255, 255, 255, 0.9)'
  let borderColor = '#000'

  switch (bubble.type) {
    case 'permission':
      bgColor = 'rgba(59, 130, 246, 0.9)' // Blue
      break
    case 'waiting':
      bgColor = 'rgba(251, 191, 36, 0.9)' // Yellow
      break
    case 'warning':
      bgColor = 'rgba(239, 68, 68, 0.9)' // Red
      break
    case 'info':
      bgColor = 'rgba(34, 197, 94, 0.9)' // Green
      break
  }

  // Draw bubble background
  ctx.fillStyle = bgColor
  ctx.fillRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight)

  // Draw border
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight)

  // Draw text
  ctx.fillStyle = borderColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(bubble.message, x, y - bubbleHeight / 2)

  // Draw pointer triangle
  ctx.beginPath()
  ctx.moveTo(x - 5, y)
  ctx.lineTo(x + 5, y)
  ctx.lineTo(x, y + 5)
  ctx.closePath()
  ctx.fillStyle = bgColor
  ctx.fill()
  ctx.stroke()
}
