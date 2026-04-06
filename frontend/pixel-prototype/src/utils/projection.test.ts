import { describe, expect, it } from 'vitest'
import { projectionForGenerate, projectionForScan } from './projection'
import type { DeployChange } from '@/store/deployStore'

const baseChange: DeployChange = {
  id: 'chg_t',
  title: 't',
  env: 'prod',
  scenario: 'live_to_iac',
  createdAt: 0,
  createdBy: 'x',
  status: 'draft',
  workshop: { step: 'select', scope: 'x', repo: 'x', inventory: [], artifact: null, updatedAt: 0 },
  resources: [],
  notes: '',
  comments: [],
}

describe('projection', () => {
  it('generate produces start+complete per resource', () => {
    const ev = projectionForGenerate({
      at: 1000,
      change: baseChange,
      resources: [
        { id: 'r1', action: 'create', type: 'aws_s3_bucket', name: 'b', summary: 's', costDeltaMonthlyUsd: 0, riskTags: [] },
        { id: 'r2', action: 'update', type: 'aws_iam_role', name: 'role', summary: 's', costDeltaMonthlyUsd: 0, riskTags: [] },
      ],
    })
    expect(ev.filter((e) => e.kind === 'build_start')).toHaveLength(2)
    expect(ev.filter((e) => e.kind === 'build_complete')).toHaveLength(2)
  })

  it('scan produces ping per inventory, drift adds alert', () => {
    const ev = projectionForScan({
      at: 1000,
      change: baseChange,
      inventory: [
        { id: 'i1', type: 'aws_s3_bucket', name: 'b', mark: 'managed', drift: 'none' },
        { id: 'i2', type: 'aws_iam_role', name: 'role', mark: 'managed', drift: 'changed' },
      ],
    })
    expect(ev.filter((e) => e.kind === 'scan_ping')).toHaveLength(2)
    expect(ev.filter((e) => e.kind === 'drift_alert')).toHaveLength(1)
  })
})

