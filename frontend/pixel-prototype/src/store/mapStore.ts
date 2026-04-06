import { create } from 'zustand'
import type { MapState, ViewportState, ZoomLevel, SelectionState, HoverState } from '@/types/map'

interface MapActions {
  setViewport: (updates: Partial<MapState['viewport']>) => void
  setZoom: (zoom: ZoomLevel) => void
  setSelection: (selection: MapState['selection']) => void
  setHovered: (hovered: MapState['hovered']) => void
  resetView: () => void
  zoomToBuilding: (buildingId: string) => void
}

type MapStore = MapState & MapActions

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800
}

export const createMapStore = () => create<MapStore>((set, get) => ({
  viewport: DEFAULT_VIEWPORT,
  zoom: 'environment',
  selection: { type: null, id: null },
  hovered: { type: null, id: null },

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates }
    })),

  setZoom: (zoom) =>
    set({ zoom }),

  setSelection: (selection) =>
    set({ selection }),

  setHovered: (hovered) =>
    set({ hovered }),

  resetView: () =>
    set({
      viewport: DEFAULT_VIEWPORT,
      zoom: 'environment',
      selection: { type: null, id: null }
    }),

  zoomToBuilding: (buildingId) => {
    // Will be implemented when we have building data
    console.log('Zoom to building:', buildingId)
  }
}))

// Create singleton instance
export const useMapStore = createMapStore();
