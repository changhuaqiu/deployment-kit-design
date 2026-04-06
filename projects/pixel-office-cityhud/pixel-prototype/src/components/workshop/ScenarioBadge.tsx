import Badge from '@/components/ui/Badge'
import type { TaskScenario } from '@/store/deployStore'

export default function ScenarioBadge({ scenario }: { scenario: TaskScenario }) {
  if (scenario === 'live_to_iac') return <Badge tone="info">城市普查建档</Badge>
  if (scenario === 'live_and_iac_to_sync') return <Badge tone="warn">整改同步蓝图</Badge>
  return <Badge tone="neutral">新区规划建设</Badge>
}
