export type DeployKitScenario = 'init' | 'update' | 'validate' | 'deploy' | 'rollback' | 'auto'

export type DeployKitEvent =
  | {
      kind: 'scenario_detected'
      sessionId: string
      scenario: DeployKitScenario
      confidence?: number
      at: number
    }
  | {
      kind: 'workflow_selected'
      sessionId: string
      workflowId: string
      workflowName: string
      totalSkills: number
      at: number
    }
  | {
      kind: 'skill_started'
      sessionId: string
      workflowId: string
      skillId: string
      skillName: string
      index: number
      total: number
      params?: Record<string, unknown>
      at: number
    }
  | {
      kind: 'skill_completed'
      sessionId: string
      workflowId: string
      skillId: string
      result: 'success'
      outputs?: Record<string, unknown>
      artifactRefs?: string[]
      at: number
    }
  | {
      kind: 'approval_required'
      sessionId: string
      workflowId: string
      gateId: string
      message: string
      approvers?: string[]
      at: number
    }
  | {
      kind: 'workflow_completed'
      sessionId: string
      workflowId: string
      status: 'success' | 'failed'
      at: number
    }

export interface DeployKitBridgeEnvelope {
  id: string
  type: string
  timestamp: number
  sessionId: string
  source?: 'opencode' | 'deploykit'
  payload: Record<string, unknown>
}
