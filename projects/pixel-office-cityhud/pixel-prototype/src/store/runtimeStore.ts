import { create } from 'zustand'
import { adaptOpenCodeEvent } from '../runtime/opencode/adapter'
import type { RuntimeClient } from '../runtime/opencode/client'
import type {
  OpenCodeEventEnvelope,
  RuntimeAgentState,
  RuntimeApprovalState,
  RuntimeLogEntry,
} from '../runtime/opencode/types'
import { createInitialRunProjectionState, reduceRunProjection, type RunProjectionState } from '../runtime/projectors/runProjector'
import { projectCityEvents } from '../runtime/projectors/cityProjector'
import { reduceOfficeProjection } from '../runtime/projectors/officeProjector'
import type { ProjectionEvent } from '../utils/projection'

export interface RuntimeState {
  sessionId: string | null
  agents: Record<string, RuntimeAgentState>
  approvals: Record<string, RuntimeApprovalState>
  liveLogs: RuntimeLogEntry[]
  projectionEvents: ProjectionEvent[]
  run: RunProjectionState
  ingestRawEvent: (event: OpenCodeEventEnvelope) => void
  attachClient: (client: RuntimeClient) => () => void
  reset: () => void
}

function createInitialRuntimeData() {
  return {
    sessionId: null,
    agents: {} as Record<string, RuntimeAgentState>,
    approvals: {} as Record<string, RuntimeApprovalState>,
    liveLogs: [] as RuntimeLogEntry[],
    projectionEvents: [] as ProjectionEvent[],
    run: createInitialRunProjectionState(),
  }
}

export const createRuntimeStore = (client?: RuntimeClient) => {
  const store = create<RuntimeState>((set) => ({
    ...createInitialRuntimeData(),
    ingestRawEvent: (event) =>
      set((state) => {
        const runtimeEvent = adaptOpenCodeEvent(event)
        if (!runtimeEvent) return state

        const office = reduceOfficeProjection(
          {
            agents: state.agents,
            approvals: state.approvals,
            ledger: state.liveLogs,
          },
          runtimeEvent
        )

        const run = reduceRunProjection(state.run, runtimeEvent)
        const projected = projectCityEvents([runtimeEvent])

        return {
          sessionId: runtimeEvent.sessionId,
          agents: office.agents,
          approvals: office.approvals,
          liveLogs: office.ledger,
          projectionEvents: [...state.projectionEvents, ...projected],
          run,
        }
      }),
    attachClient: (runtimeClient) => {
      const unsubscribe = runtimeClient.subscribe((event) => {
        store.getState().ingestRawEvent(event)
      })
      runtimeClient.connect()
      return () => {
        unsubscribe()
        runtimeClient.disconnect()
      }
    },
    reset: () => set(() => createInitialRuntimeData()),
  }))

  if (client) {
    const unsubscribe = client.subscribe((event) => {
      store.getState().ingestRawEvent(event)
    })
    client.connect()
    void unsubscribe
  }

  return store
}

export const useRuntimeStore = createRuntimeStore()
