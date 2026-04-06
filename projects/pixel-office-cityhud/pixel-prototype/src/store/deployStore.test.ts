import { beforeEach, describe, expect, it } from 'vitest'
import { useDeployStore } from '@/store/deployStore'

describe('deployStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('can create a task and complete workshop', () => {
    const id = useDeployStore.getState().createTask({
      title: 'test',
      env: 'dev',
      scenario: 'live_to_iac',
      createdBy: 'a@b.c',
      scope: 'dev / core',
      repo: 'git@demo.local:platform/iac.git',
    })

    const found = useDeployStore.getState().changes.find((c) => c.id === id)
    expect(found?.title).toContain('test')
    expect(found?.env).toBe('dev')

    useDeployStore.getState().runWorkshopScan(id)
    useDeployStore.getState().runWorkshopGenerate(id)
    useDeployStore.getState().completeWorkshop(id)

    const after = useDeployStore.getState().changes.find((c) => c.id === id)
    expect(after?.status).toBe('in_review')
  })

  it('projects scan and generate into projectionEvents', () => {
    const id = useDeployStore.getState().createTask({
      title: 'test',
      env: 'dev',
      scenario: 'live_and_iac_to_sync',
      createdBy: 'a@b.c',
    })

    useDeployStore.getState().runWorkshopScan(id)
    useDeployStore.getState().projectScan(id)
    expect(useDeployStore.getState().projectionEvents.some((e) => e.kind === 'scan_ping')).toBe(true)

    useDeployStore.getState().runWorkshopGenerate(id)
    useDeployStore.getState().projectGenerate(id)
    expect(useDeployStore.getState().projectionEvents.some((e) => e.kind === 'build_start')).toBe(true)
  })
})

