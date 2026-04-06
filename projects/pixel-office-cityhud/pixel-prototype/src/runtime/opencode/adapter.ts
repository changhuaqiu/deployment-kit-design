import type {
  OpenCodeEventEnvelope,
  RuntimeAgentStatus,
  RuntimeDecision,
  RuntimeEvent,
  RuntimeLogLevel,
  RuntimeResourceSignal,
  RuntimeRunStage,
} from './types'

const TOOL_STATUS_MAP: Record<string, 'thinking' | 'working'> = {
  read: 'thinking',
  search: 'thinking',
  write: 'working',
  edit: 'working',
  command: 'working',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function asDecision(value: unknown): RuntimeDecision {
  return value === 'rejected' ? 'rejected' : 'approved'
}

function asStatus(value: unknown, fallback: RuntimeAgentStatus = 'idle'): RuntimeAgentStatus {
  if (value === 'idle' || value === 'thinking' || value === 'working' || value === 'blocked' || value === 'done') {
    return value
  }
  return fallback
}

function asSignal(value: unknown, fallback: RuntimeResourceSignal): RuntimeResourceSignal {
  if (value === 'scan_ping' || value === 'drift_alert' || value === 'build_start' || value === 'build_complete') {
    return value
  }
  return fallback
}

function asStage(value: unknown, fallback: RuntimeRunStage = 'syntax'): RuntimeRunStage {
  if (value === 'syntax' || value === 'plan' || value === 'test_deploy' || value === 'prod_canary' || value === 'verify' || value === 'complete') {
    return value
  }
  return fallback
}

function asLogLevel(value: unknown): RuntimeLogLevel {
  return value === 'warn' || value === 'error' ? value : 'info'
}

export function adaptOpenCodeEvent(event: OpenCodeEventEnvelope): RuntimeEvent | null {
  const payload = asRecord(event.payload)

  switch (event.type) {
    case 'session.started':
      return { kind: 'session_started', sessionId: event.sessionId, at: event.timestamp }

    case 'session.ended':
      return { kind: 'session_ended', sessionId: event.sessionId, at: event.timestamp }

    case 'agent.spawned':
      return {
        kind: 'agent_spawned',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        name: asString(payload.name, 'Unknown Agent'),
        role: asString(payload.role, 'worker'),
        at: event.timestamp,
      }

    case 'agent.updated':
      return {
        kind: 'agent_status_changed',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        status: asStatus(payload.status, 'thinking'),
        task: asString(payload.task, ''),
        at: event.timestamp,
      }

    case 'agent.completed':
      return {
        kind: 'agent_status_changed',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        status: 'done',
        task: asString(payload.task, 'Completed'),
        at: event.timestamp,
      }

    case 'agent.failed':
      return {
        kind: 'agent_status_changed',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        status: 'blocked',
        task: asString(payload.task, 'Failed'),
        at: event.timestamp,
      }

    case 'tool.called': {
      const tool = asString(payload.tool, 'command')
      return {
        kind: 'agent_status_changed',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        status: TOOL_STATUS_MAP[tool] ?? 'working',
        task: asString(payload.task, tool),
        at: event.timestamp,
      }
    }

    case 'tool.completed':
      return {
        kind: 'agent_status_changed',
        sessionId: event.sessionId,
        agentId: event.agentId ?? asString(payload.agentId, 'unknown'),
        status: 'idle',
        task: asString(payload.task, 'Tool completed'),
        at: event.timestamp,
      }

    case 'approval.required':
      return {
        kind: 'approval_needed',
        sessionId: event.sessionId,
        approvalId: asString(payload.approvalId, event.id),
        ...(event.agentId ?? asString(payload.agentId, '') ? { agentId: event.agentId ?? asString(payload.agentId, '') } : {}),
        message: asString(payload.message, 'Approval required'),
        at: event.timestamp,
      }

    case 'approval.resolved':
      return {
        kind: 'approval_resolved',
        sessionId: event.sessionId,
        approvalId: asString(payload.approvalId, event.id),
        decision: asDecision(payload.decision),
        at: event.timestamp,
      }

    case 'artifact.ready':
      return {
        kind: 'artifact_ready',
        sessionId: event.sessionId,
        summary: asString(payload.summary, 'Artifact ready'),
        files: Array.isArray(payload.files)
          ? payload.files.map((file) => {
              const record = asRecord(file)
              return {
                path: asString(record.path, ''),
                change: (asString(record.change, 'modify') as 'add' | 'modify' | 'delete'),
              }
            })
          : [],
        at: event.timestamp,
      }

    case 'resource.detected':
      return {
        kind: 'resource_signal',
        sessionId: event.sessionId,
        signal: asSignal(payload.signal, payload.drift ? 'drift_alert' : 'scan_ping'),
        resourceKey: asString(payload.resourceKey, asString(payload.name, 'unknown.resource')),
        district: asString(payload.district, 'ops'),
        at: event.timestamp,
      }

    case 'resource.changed':
      return {
        kind: 'resource_signal',
        sessionId: event.sessionId,
        signal: asSignal(payload.signal, asString(payload.phase) === 'complete' ? 'build_complete' : 'build_start'),
        resourceKey: asString(payload.resourceKey, asString(payload.name, 'unknown.resource')),
        district: asString(payload.district, 'ops'),
        at: event.timestamp,
      }

    case 'run.step.changed':
      return {
        kind: 'run_stage_changed',
        sessionId: event.sessionId,
        stage: asStage(payload.stage),
        progress: asNumber(payload.progress),
        at: event.timestamp,
      }

    case 'run.log':
      return {
        kind: 'run_log',
        sessionId: event.sessionId,
        level: asLogLevel(payload.level),
        message: asString(payload.message, 'Runtime log'),
        at: event.timestamp,
      }

    case 'run.completed':
      return {
        kind: 'run_stage_changed',
        sessionId: event.sessionId,
        stage: 'complete',
        progress: 100,
        at: event.timestamp,
      }

    case 'error':
      return {
        kind: 'runtime_error',
        sessionId: event.sessionId,
        message: asString(payload.message, 'Unknown runtime error'),
        at: event.timestamp,
      }

    default:
      return null
  }
}
