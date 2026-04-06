import { useEffect } from 'react'
import { useMapStore, PRESET_VIEWPORTS } from '@/store/mapStore'
import { getNextZoomLevel, getPrevZoomLevel } from '@/components/map/MapControls'
import type { ViewportState, ZoomLevel, SelectionState } from '@/types/map'

const KEYBOARD_SHORTCUTS: Record<string, KeyboardAction> = {
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  '_': 'zoomOut',
  '0': 'resetView',
  'ArrowUp': 'panUp',
  'ArrowDown': 'panDown',
  'ArrowLeft': 'panLeft',
  'ArrowRight': 'panRight',
  'Escape': 'clearSelection',
  '1': 'presetTestCity',
  '2': 'presetProdCity',
  '3': 'presetAllCities',
}

type KeyboardAction =
  | 'zoomIn' | 'zoomOut' | 'resetView'
  | 'panUp' | 'panDown' | 'panLeft' | 'panRight'
  | 'clearSelection'
  | 'presetTestCity' | 'presetProdCity' | 'presetAllCities'

export function useKeyboardShortcuts(
  viewport: ViewportState,
  zoom: ZoomLevel,
  selection: SelectionState
) {
  const setViewport = useMapStore((s) => s.setViewport)
  const setZoom = useMapStore((s) => s.setZoom)
  const setSelection = useMapStore((s) => s.setSelection)
  const resetView = useMapStore((s) => s.resetView)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return
      }

      const action = KEYBOARD_SHORTCUTS[e.key]
      if (!action) return

      e.preventDefault()

      switch (action) {
        case 'zoomIn':
          setZoom(getNextZoomLevel(zoom))
          break
        case 'zoomOut':
          setZoom(getPrevZoomLevel(zoom))
          break
        case 'resetView':
          resetView()
          break
        case 'panUp':
          setViewport({ y: viewport.y - 100 })
          break
        case 'panDown':
          setViewport({ y: viewport.y + 100 })
          break
        case 'panLeft':
          setViewport({ x: viewport.x - 100 })
          break
        case 'panRight':
          setViewport({ x: viewport.x + 100 })
          break
        case 'clearSelection':
          setSelection({ type: null, id: null })
          break
        case 'presetTestCity':
          setViewport({ x: PRESET_VIEWPORTS.test.x, y: PRESET_VIEWPORTS.test.y })
          setZoom('environment')
          break
        case 'presetProdCity':
          setViewport({ x: PRESET_VIEWPORTS.prod.x, y: PRESET_VIEWPORTS.prod.y })
          setZoom('environment')
          break
        case 'presetAllCities':
          setViewport({ x: PRESET_VIEWPORTS.all.x, y: PRESET_VIEWPORTS.all.y })
          setZoom('world')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewport, zoom, selection])
}
