import type { RuntimeEvent, RuntimeLogEntry, RuntimeRunStage } from '../opencode/types'

export interface RunProjectionState {
  currentStage: RuntimeRunStage
  progress: number
  status: 'idle' | 'running' | 'succeeded' | 'failed'
  logs: RuntimeLogEntry[]
}

export function createInitialRunProjectionState(): RunProjectionState {
  return {
    currentStage: 'syntax',
    progress: 0,
    status: 'idle',
    logs: [],
  }
}

export function reduceRunProjection(state: RunProjectionState, event: RuntimeEvent): RunProjectionState {
  if (event.kind === 'run_stage_changed') {
    return {
      ...state,
      currentStage: event.stage,
      progress: event.progress ?? state.progress,
      status: event.stage === 'complete' ? (state.status === 'failed' ? 'failed' : 'succeeded') : 'running',
    }
  }

  if (event.kind === 'run_log') {
    return {
      ...state,
      logs: [
        ...state.logs,
        {
          id: `${event.sessionId}:${event.at}:run-log`,
          at: event.at,
          level: event.level,
          message: event.message,
        },
      ],
    }
  }

  if (event.kind === 'runtime_error') {
    return {
      ...state,
      status: 'failed',
      logs: [
        ...state.logs,
        {
          id: `${event.sessionId}:${event.at}:runtime-error`,
          at: event.at,
          level: 'error',
          message: event.message,
        },
      ],
    }
  }

  return state
}
