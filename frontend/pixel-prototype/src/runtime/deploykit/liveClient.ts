import { createSseRuntimeClient } from '../opencode/client'

export function createLiveDeployKitClient() {
  return createSseRuntimeClient('http://localhost:8787/deploykit/events')
}
