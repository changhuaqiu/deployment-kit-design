import type { DeployChange, RiskTag } from '@/store/deployStore'

export type RiskLevel = 'low' | 'medium' | 'high'

export function computeRiskScore(change: DeployChange) {
  const weights: Record<RiskTag, number> = {
    delete: 30,
    iam: 18,
    network: 14,
    data: 16,
    blast_radius: 12,
  }

  const base = change.resources.length * 6
  const tagScore = change.resources.reduce((acc, r) => {
    const unique = Array.from(new Set(r.riskTags))
    return acc + unique.reduce((t, tag) => t + weights[tag], 0)
  }, 0)

  const score = Math.min(100, Math.round(base + tagScore))

  let level: RiskLevel = 'low'
  if (score >= 70) level = 'high'
  else if (score >= 40) level = 'medium'

  return { score, level }
}

export function computeCostDelta(change: DeployChange) {
  const delta = change.resources.reduce((acc, r) => acc + r.costDeltaMonthlyUsd, 0)
  return Math.round(delta * 100) / 100
}

