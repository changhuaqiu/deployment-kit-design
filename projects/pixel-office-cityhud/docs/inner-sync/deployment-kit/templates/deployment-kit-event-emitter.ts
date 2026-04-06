export function emitDeployKitEvent(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(event)}\n`)
}

export function emitScenarioDetected(sessionId: string, scenario: string, confidence: number) {
  emitDeployKitEvent({
    kind: 'scenario_detected',
    sessionId,
    scenario,
    confidence,
    at: Date.now(),
  })
}

export function emitWorkflowSelected(sessionId: string, workflowId: string, workflowName: string, totalSkills: number) {
  emitDeployKitEvent({
    kind: 'workflow_selected',
    sessionId,
    workflowId,
    workflowName,
    totalSkills,
    at: Date.now(),
  })
}
