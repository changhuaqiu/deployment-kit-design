import { beforeEach, describe, expect, it } from 'vitest'
import { useDeployStore } from './deployStore'
import { useRuntimeStore } from './runtimeStore'

describe('deployStore deployment-kit ingestion', () => {
  beforeEach(() => {
    localStorage.clear()
    useDeployStore.getState().resetDemoData()
    useDeployStore.setState({ activeWorkflow: null })
  })

  it('captures workflow selection as workflow context', () => {
    const store = useDeployStore.getState()
    store.ingestDeployKitEvent({
      kind: 'workflow_selected',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      workflowName: 'init-service',
      totalSkills: 5,
      at: 1710000000000,
    })

    expect(useDeployStore.getState().activeWorkflow?.workflowId).toBe('wf_init')
    expect(useDeployStore.getState().activeWorkflow?.status).toBe('idle')
  })

  it('updates current skill and completion status through the workflow lifecycle', () => {
    const store = useDeployStore.getState()
    store.ingestDeployKitEvent({
      kind: 'workflow_selected',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      workflowName: 'init-service',
      totalSkills: 5,
      at: 1710000000000,
    })

    store.ingestDeployKitEvent({
      kind: 'skill_started',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      skillId: 'discover-resources',
      skillName: 'discover-resources',
      index: 1,
      total: 5,
      at: 1710000000100,
    })

    expect(useDeployStore.getState().activeWorkflow?.currentSkillId).toBe('discover-resources')
    expect(useDeployStore.getState().activeWorkflow?.status).toBe('running')

    store.ingestDeployKitEvent({
      kind: 'approval_required',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      gateId: 'gate_1',
      message: 'Need approval to deploy',
      at: 1710000000200,
    })

    expect(useDeployStore.getState().activeWorkflow?.status).toBe('waiting_approval')

    store.ingestDeployKitEvent({
      kind: 'workflow_completed',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      status: 'success',
      at: 1710000001000,
    })

    expect(useDeployStore.getState().activeWorkflow?.status).toBe('succeeded')
    expect(useDeployStore.getState().activeWorkflow?.currentSkillId).toBeNull()
  })

  it('does not touch runtimeStore agent state', () => {
    const before = useRuntimeStore.getState().agents

    useDeployStore.getState().ingestDeployKitEvent({
      kind: 'workflow_completed',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      status: 'success',
      at: 1710000001000,
    })

    expect(useRuntimeStore.getState().agents).toEqual(before)
  })
})
