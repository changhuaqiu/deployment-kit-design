import { describe, expect, it, vi } from 'vitest'
import { createSseHub } from './sseHub'

describe('createSseHub', () => {
  it('broadcasts serialized events', () => {
    const hub = createSseHub()
    const write = vi.fn()
    hub.addClient({ write } as never)
    hub.broadcast({ type: 'session.started' })
    expect(write).toHaveBeenCalled()
  })

  it('tracks connected clients', () => {
    const hub = createSseHub()
    const remove = hub.addClient({ write: vi.fn() } as never)
    expect(hub.size()).toBe(1)
    remove()
    expect(hub.size()).toBe(0)
  })
})
