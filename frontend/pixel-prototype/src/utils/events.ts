/**
 * Simple pub/sub event system
 * Allows components to communicate without tight coupling
 */

type EventCallback = (data?: any) => void

class EventEmitter {
  private events: Record<string, EventCallback[]> = {}

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event].push(callback)

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    if (!this.events[event]) {
      return
    }

    this.events[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error)
      }
    })
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    delete this.events[event]
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events[event]?.length || 0
  }
}

/**
 * Global event manager
 * Maps deployment kit skills to district events
 */
class EventManager {
  private emitter = new EventEmitter()

  // District events
  readonly DISTRICT_ISSUE_DETECTED = 'district:issue:detected'
  readonly DISTRICT_ISSUE_RESOLVED = 'district:issue:resolved'
  readonly DISTRICT_RESOURCE_ADDED = 'district:resource:added'
  readonly DISTRICT_RESOURCE_REMOVED = 'district:resource:removed'

  // Agent events
  readonly AGENT_TASK_ASSIGNED = 'agent:task:assigned'
  readonly AGENT_TASK_COMPLETED = 'agent:task:completed'
  readonly AGENT_TASK_FAILED = 'agent:task:failed'
  readonly AGENT_STATE_CHANGED = 'agent:state:changed'

  // Skill events (mapped from deployment kit)
  readonly SKILL_TERRAFORM_SCAN = 'skill:terraform:scan'
  readonly SKILL_TERRAFORM_VALIDATE = 'skill:terraform:validate'
  readonly SKILL_TERRAFORM_GENERATE = 'skill:terraform:generate'
  readonly SKILL_TERRAFORM_DEPLOY = 'skill:terraform:deploy'

  /**
   * Subscribe to district issue event
   */
  onDistrictIssue(callback: (data: { districtId: string; issue: any }) => void): () => void {
    return this.emitter.on(this.DISTRICT_ISSUE_DETECTED, callback)
  }

  /**
   * Subscribe to agent task completion
   */
  onAgentTaskComplete(callback: (data: { agentId: string; task: any }) => void): () => void {
    return this.emitter.on(this.AGENT_TASK_COMPLETED, callback)
  }

  /**
   * Subscribe to skill events
   */
  onSkill(skill: string, callback: (data: any) => void): () => void {
    const event = `skill:${skill}`
    return this.emitter.on(event, callback)
  }

  /**
   * Emit district issue
   */
  emitDistrictIssue(districtId: string, issue: any): void {
    this.emitter.emit(this.DISTRICT_ISSUE_DETECTED, { districtId, issue })
  }

  /**
   * Emit agent task completion
   */
  emitAgentTaskComplete(agentId: string, task: any): void {
    this.emitter.emit(this.AGENT_TASK_COMPLETED, { agentId, task })
  }

  /**
   * Emit skill event
   */
  emitSkill(skill: string, data: any): void {
    const event = `skill:${skill}`
    this.emitter.emit(event, data)
  }

  /**
   * Generic subscribe method
   */
  on(event: string, callback: EventCallback): () => void {
    return this.emitter.on(event, callback)
  }

  /**
   * Generic emit method
   */
  emit(event: string, data?: any): void {
    this.emitter.emit(event, data)
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.emitter.off('*')
  }
}

// Export singleton instance
export const eventManager = new EventManager()

// Export EventEmitter class for custom instances
export { EventEmitter }
export type { EventCallback }
