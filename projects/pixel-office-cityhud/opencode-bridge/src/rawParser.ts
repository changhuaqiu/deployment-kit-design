import type { BridgeRawEvent } from './types'

export function parseJsonLine(line: string): BridgeRawEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed) as BridgeRawEvent
  } catch {
    return null
  }
}
