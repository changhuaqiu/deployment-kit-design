import { describe, expect, it } from 'vitest'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'
import type { DeployChange } from '@/store/deployStore'

describe('risk', () => {
  it('computes higher risk for delete and iam', () => {
    const base: DeployChange = {
      id: 'x',
      title: 't',
      env: 'prod',
      scenario: 'live_to_iac',
      createdAt: Date.now(),
      createdBy: 'a',
      status: 'draft',
      workshop: {
        step: 'select',
        scope: 'prod / core',
        repo: 'git@demo.local:platform/iac.git',
        inventory: [],
        artifact: null,
        updatedAt: Date.now(),
      },
      notes: '',
      comments: [],
      resources: [
        {
          id: 'r1',
          action: 'delete',
          type: 'aws_iam_policy',
          name: 'p',
          summary: 's',
          costDeltaMonthlyUsd: 0,
          riskTags: ['delete', 'iam'],
        },
      ],
    }

    const { score, level } = computeRiskScore(base)
    expect(score).toBeGreaterThanOrEqual(40)
    expect(['medium', 'high']).toContain(level)
  })

  it('sums cost deltas', () => {
    const c: DeployChange = {
      id: 'x',
      title: 't',
      env: 'dev',
      scenario: 'new_to_iac',
      createdAt: Date.now(),
      createdBy: 'a',
      status: 'draft',
      workshop: {
        step: 'select',
        scope: 'dev / core',
        repo: 'git@demo.local:platform/iac.git',
        inventory: [],
        artifact: null,
        updatedAt: Date.now(),
      },
      notes: '',
      comments: [],
      resources: [
        {
          id: 'r1',
          action: 'create',
          type: 't',
          name: 'n',
          summary: 's',
          costDeltaMonthlyUsd: 1.23,
          riskTags: [],
        },
        {
          id: 'r2',
          action: 'update',
          type: 't',
          name: 'n2',
          summary: 's',
          costDeltaMonthlyUsd: -0.5,
          riskTags: [],
        },
      ],
    }
    expect(computeCostDelta(c)).toBeCloseTo(0.73, 3)
  })
})

