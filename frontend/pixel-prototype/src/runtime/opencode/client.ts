import type { OpenCodeEventEnvelope } from './types'

export interface RuntimeClient {
  connect(): void
  disconnect(): void
  subscribe(listener: (event: OpenCodeEventEnvelope) => void): () => void
}

export interface MockRuntimeClient extends RuntimeClient {
  emit(event: OpenCodeEventEnvelope): void
}

export function createMockRuntimeClient(): MockRuntimeClient {
  const listeners = new Set<(event: OpenCodeEventEnvelope) => void>()

  return {
    connect() {},
    disconnect() {},
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(event) {
      listeners.forEach((listener) => listener(event))
    },
  }
}

export function createSseRuntimeClient(url: string): RuntimeClient {
  let source: EventSource | null = null
  const listeners = new Set<(event: OpenCodeEventEnvelope) => void>()

  return {
    connect() {
      source = new EventSource(url)
      source.onmessage = (message) => {
        const event = JSON.parse(message.data) as OpenCodeEventEnvelope
        listeners.forEach((listener) => listener(event))
      }
    },
    disconnect() {
      source?.close()
      source = null
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
