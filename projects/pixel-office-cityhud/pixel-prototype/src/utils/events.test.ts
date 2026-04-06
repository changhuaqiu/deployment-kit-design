import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventManager, EventEmitter } from './events'

describe('EventEmitter', () => {
  let emitter: EventEmitter

  beforeEach(() => {
    emitter = new EventEmitter()
  })

  it('should subscribe to events', () => {
    const callback = vi.fn()
    const unsubscribe = emitter.on('test-event', callback)

    expect(typeof unsubscribe).toBe('function')
  })

  it('should call callback when event is emitted', () => {
    const callback = vi.fn()
    emitter.on('test-event', callback)

    emitter.emit('test-event', { data: 'test' })

    expect(callback).toHaveBeenCalledWith({ data: 'test' })
  })

  it('should call multiple callbacks for same event', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    emitter.on('test-event', callback1)
    emitter.on('test-event', callback2)

    emitter.emit('test-event')

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })

  it('should unsubscribe callback', () => {
    const callback = vi.fn()
    const unsubscribe = emitter.on('test-event', callback)

    unsubscribe()
    emitter.emit('test-event')

    expect(callback).not.toHaveBeenCalled()
  })

  it('should return correct listener count', () => {
    emitter.on('event1', vi.fn())
    emitter.on('event1', vi.fn())
    emitter.on('event2', vi.fn())

    expect(emitter.listenerCount('event1')).toBe(2)
    expect(emitter.listenerCount('event2')).toBe(1)
    expect(emitter.listenerCount('nonexistent')).toBe(0)
  })

  it('should handle errors in callbacks', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = vi.fn(() => {
      throw new Error('Test error')
    })

    const goodCallback = vi.fn()

    emitter.on('test-event', errorCallback)
    emitter.on('test-event', goodCallback)

    emitter.emit('test-event')

    expect(errorCallback).toHaveBeenCalled()
    expect(goodCallback).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})

describe('EventManager', () => {
  beforeEach(() => {
    eventManager.clear()
  })

  it('should define district event constants', () => {
    expect(eventManager.DISTRICT_ISSUE_DETECTED).toBe('district:issue:detected')
    expect(eventManager.DISTRICT_ISSUE_RESOLVED).toBe('district:issue:resolved')
    expect(eventManager.DISTRICT_RESOURCE_ADDED).toBe('district:resource:added')
    expect(eventManager.DISTRICT_RESOURCE_REMOVED).toBe('district:resource:removed')
  })

  it('should define agent event constants', () => {
    expect(eventManager.AGENT_TASK_ASSIGNED).toBe('agent:task:assigned')
    expect(eventManager.AGENT_TASK_COMPLETED).toBe('agent:task:completed')
    expect(eventManager.AGENT_TASK_FAILED).toBe('agent:task:failed')
    expect(eventManager.AGENT_STATE_CHANGED).toBe('agent:state:changed')
  })

  it('should define skill event constants', () => {
    expect(eventManager.SKILL_TERRAFORM_SCAN).toBe('skill:terraform:scan')
    expect(eventManager.SKILL_TERRAFORM_VALIDATE).toBe('skill:terraform:validate')
    expect(eventManager.SKILL_TERRAFORM_GENERATE).toBe('skill:terraform:generate')
    expect(eventManager.SKILL_TERRAFORM_DEPLOY).toBe('skill:terraform:deploy')
  })

  it('should subscribe to district issue events', () => {
    const callback = vi.fn()
    const unsubscribe = eventManager.onDistrictIssue(callback)

    eventManager.emitDistrictIssue('test-district', { type: 'error' })

    expect(callback).toHaveBeenCalledWith({
      districtId: 'test-district',
      issue: { type: 'error' }
    })

    unsubscribe()
  })

  it('should subscribe to agent task completion events', () => {
    const callback = vi.fn()
    const unsubscribe = eventManager.onAgentTaskComplete(callback)

    eventManager.emitAgentTaskComplete('agent-1', { id: 'task-1', status: 'completed' })

    expect(callback).toHaveBeenCalledWith({
      agentId: 'agent-1',
      task: { id: 'task-1', status: 'completed' }
    })

    unsubscribe()
  })

  it('should subscribe to skill events', () => {
    const callback = vi.fn()
    const unsubscribe = eventManager.onSkill('terraform:scan', callback)

    eventManager.emitSkill('terraform:scan', { resources: 5 })

    expect(callback).toHaveBeenCalledWith({ resources: 5 })

    unsubscribe()
  })

  it('should support generic on/emit methods', () => {
    const callback = vi.fn()

    eventManager.on('custom-event', callback)
    eventManager.emit('custom-event', { custom: 'data' })

    expect(callback).toHaveBeenCalledWith({ custom: 'data' })
  })
})
