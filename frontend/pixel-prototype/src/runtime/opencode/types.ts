export type RuntimeAgentStatus = 'idle' | 'thinking' | 'working' | 'blocked' | 'done'
export type RuntimeApprovalStatus = 'pending' | 'approved' | 'rejected'
export type RuntimeDecision = 'approved' | 'rejected'
export type RuntimeChangeKind = 'add' | 'modify' | 'delete'
export type RuntimeRunStage = 'syntax' | 'plan' | 'test_deploy' | 'prod_canary' | 'verify' | 'complete'
export type RuntimeResourceSignal = 'scan_ping' | 'drift_alert' | 'build_start' | 'build_complete'
export type RuntimeLogLevel = 'info' | 'warn' | 'error'

export type OpenCodeEventType =
  | 'session.started'
  | 'session.ended'
  | 'agent.spawned'
  | 'agent.updated'
  | 'agent.completed'
  | 'agent.failed'
  | 'tool.called'
  | 'tool.completed'
  | 'approval.required'
  | 'approval.resolved'
  | 'artifact.ready'
  | 'resource.detected'
  | 'resource.changed'
  | 'run.step.changed'
  | 'run.log'
  | 'run.completed'
  | 'error'

export interface OpenCodeEventEnvelope<T = unknown> {
  id: string
  type: OpenCodeEventType
  timestamp: number
  sessionId: string
  agentId?: string
  payload: T
}

export type RuntimeEvent =
  | { kind: 'session_started'; sessionId: string; at: number }
  | { kind: 'session_ended'; sessionId: string; at: number }
  | { kind: 'agent_spawned'; sessionId: string; agentId: string; name: string; role: string; at: number }
  | {
      kind: 'agent_status_changed'
      sessionId: string
      agentId: string
      status: RuntimeAgentStatus
      task?: string
      at: number
    }
  | {
      kind: 'approval_needed'
      sessionId: string
      approvalId: string
      agentId?: string
      message: string
      at: number
    }
  | {
      kind: 'approval_resolved'
      sessionId: string
      approvalId: string
      decision: RuntimeDecision
      at: number
    }
  | {
      kind: 'artifact_ready'
      sessionId: string
      summary: string
      files: { path: string; change: RuntimeChangeKind }[]
      at: number
    }
  | {
      kind: 'resource_signal'
      sessionId: string
      signal: RuntimeResourceSignal
      resourceKey: string
      district: string
      at: number
    }
  | {
      kind: 'run_stage_changed'
      sessionId: string
      stage: RuntimeRunStage
      progress?: number
      at: number
    }
  | {
      kind: 'run_log'
      sessionId: string
      level: RuntimeLogLevel
      message: string
      at: number
    }
  | { kind: 'runtime_error'; sessionId: string; message: string; at: number }

export interface RuntimeAgentState {
  id: string
  sessionId: string
  name: string
  role: string
  status: RuntimeAgentStatus
  currentTask: string
  updatedAt: number
}

export interface RuntimeApprovalState {
  id: string
  sessionId: string
  status: RuntimeApprovalStatus
  message: string
  requestedAt: number
}

export interface RuntimeLogEntry {
  id: string
  at: number
  level: RuntimeLogLevel
  message: string
}
