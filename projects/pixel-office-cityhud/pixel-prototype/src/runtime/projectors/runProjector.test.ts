import { describe, expect, it } from 'vitest'
import { createInitialRunProjectionState, reduceRunProjection } from './runProjector'

describe('reduceRunProjection', () => {
  it('tracks current stage and progress', () => {
    const next = reduceRunProjection(createInitialRunProjectionState(), {
      kind: 'run_stage_changed',
      sessionId: 'sess_1',
      stage: 'plan',
      progress: 12,
      at: 1710000000000,
    })

    expect(next.currentStage).toBe('plan')
    expect(next.progress).toBe(12)
    expect(next.status).toBe('running')
  })

  it('records run logs', () => {
    const next = reduceRunProjection(createInitialRunProjectionState(), {
      kind: 'run_log',
      sessionId: 'sess_1',
      level: 'info',
      message: 'Generated plan',
      at: 1710000000050,
    })

    expect(next.logs.at(-1)?.message).toBe('Generated plan')
  })

  it('marks failed status on runtime_error', () => {
    const next = reduceRunProjection(
      {
        currentStage: 'verify',
        progress: 90,
        status: 'running',
        logs: [],
      },
      { kind: 'runtime_error', sessionId: 'sess_1', message: 'permission denied', at: 1710000000100 }
    )

    expect(next.status).toBe('failed')
    expect(next.logs.at(-1)?.level).toBe('error')
  })
})
