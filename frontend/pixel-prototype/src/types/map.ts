export type ZoomLevel = 'world' | 'environment' | 'building'

export interface ViewportState {
  x: number
  y: number
  width: number
  height: number
}

export interface Building {
  id: string
  type: 'compute' | 'data' | 'network' | 'config'
  name: string
  city: 'test' | 'prod'
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  status: 'healthy' | 'warning' | 'error'
  metrics: {
    resourceCount: number
    cpu?: number
    memory?: number
  }
}

export interface Connection {
  from: string
  to: string
  type: 'dependency' | 'dataflow'
}

export interface SelectionState {
  type: 'building' | 'agent' | null
  id: string | null
}

export interface HoverState {
  type: 'building' | 'agent' | null
  id: string | null
}

export interface MapState {
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  hovered: HoverState
}

const ZOOM_LEVELS: Record<ZoomLevel, number> = {
  world: 0.5,
  environment: 1.0,
  building: 2.0
}

export function getZoomScale(zoom: ZoomLevel): number {
  return ZOOM_LEVELS[zoom]
}
