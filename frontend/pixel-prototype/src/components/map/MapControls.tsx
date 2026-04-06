import { useEffect, useRef } from 'react'
import { useMapStore, PRESET_VIEWPORTS } from '@/store/mapStore'
import { MiniMap } from './MiniMap'
import { animateZoomTransition, cancelCurrentAnimation } from '@/utils/mapAnimations'
import type { ZoomLevel, Building } from '@/types/map'

export function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.min(idx + 1, levels.length - 1)]
}

export function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.max(idx - 1, 0)]
}

interface MapControlsProps {
  buildings?: Building[]
}

export function MapControls({ buildings = [] }: MapControlsProps) {
  const viewport = useMapStore((s) => s.viewport)
  const zoom = useMapStore((s) => s.zoom)
  const setViewport = useMapStore((s) => s.setViewport)
  const setZoom = useMapStore((s) => s.setZoom)
  const resetView = useMapStore((s) => s.resetView)

  // Ref to track current animation frame
  const animationFrameRef = useRef<number>()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      cancelCurrentAnimation()
    }
  }, [])

  const handleZoomIn = () => {
    const nextZoom = getNextZoomLevel(zoom)

    if (nextZoom !== zoom) {
      // Cancel previous animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      const anim = animateZoomTransition({ ...viewport, zoom }, nextZoom, 2000)

      const frame = (time: number) => {
        const continueAnimation = anim(time, (newViewport) => {
          setViewport(newViewport)
        })

        if (continueAnimation) {
          animationFrameRef.current = requestAnimationFrame(frame)
        } else {
          animationFrameRef.current = undefined
          setZoom(nextZoom)
        }
      }

      animationFrameRef.current = requestAnimationFrame(frame)
    }
  }

  const handleZoomOut = () => {
    const prevZoom = getPrevZoomLevel(zoom)

    if (prevZoom !== zoom) {
      // Cancel previous animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      const anim = animateZoomTransition({ ...viewport, zoom }, prevZoom, 2000)

      const frame = (time: number) => {
        const continueAnimation = anim(time, (newViewport) => {
          setViewport(newViewport)
        })

        if (continueAnimation) {
          animationFrameRef.current = requestAnimationFrame(frame)
        } else {
          animationFrameRef.current = undefined
          setZoom(prevZoom)
        }
      }

      animationFrameRef.current = requestAnimationFrame(frame)
    }
  }

  const handleReset = () => resetView()
  const handlePreset = (preset: keyof typeof PRESET_VIEWPORTS) => {
    setViewport(PRESET_VIEWPORTS[preset])
    setZoom('environment')
  }

  return (
    <>
      <MiniMap buildings={buildings} viewport={viewport} zoom={zoom} />

      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #8b5cf6'
      }}>
        <div style={{ color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
          Zoom: {zoom}
        </div>

        <button onClick={handleZoomIn} aria-label="Zoom in" style={{
          width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer',
          backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px'
        }}>+</button>

        <button onClick={handleZoomOut} aria-label="Zoom out" style={{
          width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer',
          backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px'
        }}>−</button>

        <button onClick={handleReset} aria-label="Reset view" style={{
          marginTop: '8px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
          backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px'
        }}>Reset</button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #8b5cf6'
        }}>
          <button onClick={() => handlePreset('test')} style={{
            padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
            backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px'
          }}>Test</button>

          <button onClick={() => handlePreset('prod')} style={{
            padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
            backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px'
          }}>Prod</button>

          <button onClick={() => handlePreset('all')} style={{
            padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
            backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px'
          }}>All</button>
        </div>

        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #8b5cf6',
          color: '#9ca3af',
          fontSize: '11px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap'
        }}>
          Shortcuts: +/- zoom | Arrows pan | Esc clear | 1/2/3 presets
        </div>
      </div>
    </>
  )
}