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

      {/* Main HUD Controls */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backgroundColor: 'rgba(10, 15, 24, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '6px',
        borderRadius: '12px',
        border: '2px solid rgba(56, 189, 248, 0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 10px rgba(56,189,248,0.1)'
      }}>
        <div style={{ 
          color: '#38bdf8', 
          textAlign: 'center', 
          marginBottom: '4px',
          fontSize: '9px',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          borderBottom: '1px solid rgba(56,189,248,0.2)',
          paddingBottom: '4px'
        }}>
          ZOOM <span style={{color: '#fff'}}>{zoom === 'building' ? '3x' : zoom === 'environment' ? '2x' : '1x'}</span>
        </div>

        <button 
          onClick={handleZoomIn} 
          aria-label="Zoom in" 
          style={{
            width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer',
            backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', 
            border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '8px',
            transition: 'all 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold'
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.4)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.2)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1.05)'}
        >+</button>

        <button 
          onClick={handleZoomOut} 
          aria-label="Zoom out" 
          style={{
            width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer',
            backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', 
            border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '8px',
            transition: 'all 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold'
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.4)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.2)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1.05)'}
        >−</button>

        <button 
          onClick={handleReset} 
          aria-label="Reset view" 
          style={{
            marginTop: '4px', height: '24px', fontSize: '10px', cursor: 'pointer',
            backgroundColor: 'rgba(51, 65, 85, 0.5)', color: '#94a3b8', 
            border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '6px',
            fontWeight: 'bold', transition: 'all 0.15s ease'
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = 'rgba(71, 85, 105, 0.8)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >RST</button>
      </div>

      {/* Preset View Buttons */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(10, 15, 24, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '8px',
          borderRadius: '12px',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 8px', borderRight: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em'
          }}>
            LENS
          </div>
          
          <button onClick={() => handlePreset('test')} style={{
            padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', 
            border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.4)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
          >TEST</button>

          <button onClick={() => handlePreset('prod')} style={{
            padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', 
            border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.4)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'}
          >PROD</button>

          <button onClick={() => handlePreset('all')} style={{
            padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', 
            border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.4)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'}
          >ALL</button>
        </div>

        <div style={{
          backgroundColor: 'rgba(10, 15, 24, 0.6)',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          color: '#64748b',
          fontSize: '9px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}>
          ⌨️ +/- ZOOM | ⇦⇧⇨⇩ PAN | ESC CLEAR
        </div>
      </div>
    </>
  )
}