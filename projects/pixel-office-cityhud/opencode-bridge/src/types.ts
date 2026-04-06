export interface BridgeRawEvent {
  type?: string
  kind?: string
  sessionId?: string
  agentId?: string
  [key: string]: unknown
}

export interface BridgeEnvelope {
  id: string
  type: string
  timestamp: number
  sessionId: string
  agentId?: string
  source?: 'opencode' | 'deploykit'
  payload: Record<string, unknown>
}
