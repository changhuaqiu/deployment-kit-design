import type {
  RuntimeAgentState,
  RuntimeApprovalState,
  RuntimeEvent,
  RuntimeLogEntry,
} from '../opencode/types'

export interface OfficeProjectionState {
  agents: Record<string, RuntimeAgentState>
  approvals: Record<string, RuntimeApprovalState>
  ledger: RuntimeLogEntry[]
}

function appendLog(state: OfficeProjectionState, entry: RuntimeLogEntry): OfficeProjectionState {
  return {
    ...state,
    ledger: [...state.ledger, entry],
  }
}

export function reduceOfficeProjection(state: OfficeProjectionState, event: RuntimeEvent): OfficeProjectionState {
  if (event.kind === 'agent_spawned') {
    return appendLog(
      {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: {
            id: event.agentId,
            sessionId: event.sessionId,
            name: event.name,
            role: event.role,
            status: 'idle',
            currentTask: 'Awaiting task',
            updatedAt: event.at,
          },
        },
      },
      {
        id: `${event.sessionId}:${event.agentId}:${event.at}:spawned`,
        at: event.at,
        level: 'info',
        message: `${event.name} spawned.`,
      }
    )
  }

  if (event.kind === 'agent_status_changed') {
    const agent = state.agents[event.agentId]
    if (!agent) return state

    return appendLog(
      {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: {
            ...agent,
            status: event.status,
            currentTask: event.task || agent.currentTask,
            updatedAt: event.at,
          },
        },
      },
      {
        id: `${event.sessionId}:${event.agentId}:${event.at}:status`,
        at: event.at,
        level: event.status === 'blocked' ? 'warn' : 'info',
        message: `${agent.name} -> ${event.status}${event.task ? ` (${event.task})` : ''}`,
      }
    )
  }

  if (event.kind === 'approval_needed') {
    return appendLog(
      {
        ...state,
        approvals: {
          ...state.approvals,
          [event.approvalId]: {
            id: event.approvalId,
            sessionId: event.sessionId,
            status: 'pending',
            message: event.message,
            requestedAt: event.at,
          },
        },
      },
      {
        id: `${event.sessionId}:${event.approvalId}:${event.at}:approval-needed`,
        at: event.at,
        level: 'warn',
        message: event.message,
      }
    )
  }

  if (event.kind === 'approval_resolved') {
    const approval = state.approvals[event.approvalId]

    return appendLog(
      {
        ...state,
        approvals: {
          ...state.approvals,
          [event.approvalId]: {
            id: event.approvalId,
            sessionId: event.sessionId,
            status: event.decision,
            message: approval?.message ?? 'Approval resolved',
            requestedAt: approval?.requestedAt ?? event.at,
          },
        },
      },
      {
        id: `${event.sessionId}:${event.approvalId}:${event.at}:approval-resolved`,
        at: event.at,
        level: event.decision === 'approved' ? 'info' : 'warn',
        message: `Approval ${event.decision}.`,
      }
    )
  }

  if (event.kind === 'run_log') {
    return appendLog(state, {
      id: `${event.sessionId}:${event.at}:run-log`,
      at: event.at,
      level: event.level,
      message: event.message,
    })
  }

  if (event.kind === 'runtime_error') {
    return appendLog(state, {
      id: `${event.sessionId}:${event.at}:runtime-error`,
      at: event.at,
      level: 'error',
      message: event.message,
    })
  }

  return state
}
