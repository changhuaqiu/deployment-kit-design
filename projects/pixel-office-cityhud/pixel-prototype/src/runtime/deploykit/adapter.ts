import type { DeployKitBridgeEnvelope, DeployKitEvent } from './types'

export function adaptDeployKitEnvelope(envelope: DeployKitBridgeEnvelope): DeployKitEvent | null {
  if (envelope.type !== 'deploykit.business') return null
  const payload = envelope.payload
  if (!payload || typeof payload.kind !== 'string') return null
  return payload as DeployKitEvent
}
