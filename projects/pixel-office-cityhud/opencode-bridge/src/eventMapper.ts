import type { BridgeEnvelope, BridgeRawEvent } from './types'

const DEPLOYKIT_KINDS = new Set([
  'entry_invoked',
  'scenario_detected',
  'workflow_selected',
  'workflow_started',
  'workflow_phase_changed',
  'skill_started',
  'skill_completed',
  'skill_failed',
  'approval_required',
  'approval_resolved',
  'resource_delta',
  'rollback_started',
  'rollback_completed',
  'workflow_completed',
])

export function mapRawEvent(raw: BridgeRawEvent): BridgeEnvelope | null {
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : 'unknown'
  const timestamp = Date.now()
  const rawKind = typeof raw.kind === 'string' ? raw.kind : undefined
  const rawType = typeof raw.type === 'string' ? raw.type : undefined

  if (rawKind && DEPLOYKIT_KINDS.has(rawKind)) {
    return {
      id: `${rawKind}:${sessionId}:${timestamp}`,
      type: 'deploykit.business',
      timestamp,
      sessionId,
      source: 'deploykit',
      payload: raw,
    }
  }

  return {
    id: `${rawType}:${sessionId}:${timestamp}`,
    type: rawType ?? 'unknown',
    timestamp,
    sessionId,
    agentId: typeof raw.agentId === 'string' ? raw.agentId : undefined,
    source: 'opencode',
    payload: raw,
  }
}
