import { createSseRuntimeClient } from './client'

export function createLiveRuntimeClient() {
  return createSseRuntimeClient('http://localhost:8787/runtime/events')
}
