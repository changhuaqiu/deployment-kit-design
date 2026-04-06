import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, Sparkles } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Empty from '@/components/Empty'
import WorkshopSteps from '@/components/workshop/WorkshopSteps'
import InventoryPanel from '@/components/workshop/InventoryPanel'
import ArtifactPanel from '@/components/workshop/ArtifactPanel'
import ScenarioBadge from '@/components/workshop/ScenarioBadge'
import { useDeployStore } from '@/store/deployStore'

export default function Workshop() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ''

  const changes = useDeployStore((s) => s.changes)
  const updateWorkshop = useDeployStore((s) => s.updateWorkshop)
  const runWorkshopScan = useDeployStore((s) => s.runWorkshopScan)
  const runWorkshopGenerate = useDeployStore((s) => s.runWorkshopGenerate)
  const completeWorkshop = useDeployStore((s) => s.completeWorkshop)

  const change = useMemo(() => changes.find((c) => c.id === id) ?? null, [changes, id])
  const [scope, setScope] = useState(change?.workshop.scope ?? '')
  const [repo, setRepo] = useState(change?.workshop.repo ?? '')

  if (!change) {
    return (
      <AppShell title="IaC 工坊">
        <Empty
          title="未找到任务"
          description="该任务可能已被重置或不存在。"
          action={
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> 返回地图
            </Button>
          }
        />
      </AppShell>
    )
  }

  const step = change.workshop.step
  const canGoReview = step === 'preview' || step === 'complete'

  return (
    <AppShell
      title="规划局（蓝图工坊）"
      right={
        <div className="hidden items-center gap-2 md:flex">
          <ScenarioBadge scenario={change.scenario} />
          <Badge tone="info">{change.env.toUpperCase()}</Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.35fr_0.9fr]">
        <div className="space-y-3">
          <div className="px-panel p-3">
            <div className="text-sm font-semibold">工程单信息</div>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <ScenarioBadge scenario={change.scenario} />
                <Badge tone="info">{change.env.toUpperCase()}</Badge>
                <Badge tone="neutral">状态：{change.status}</Badge>
              </div>
              <div className="text-xs text-[var(--px-muted)]">{change.title}</div>
            </div>

            <div className="mt-3 grid gap-2">
              <div>
                <div className="text-xs font-semibold text-[var(--px-muted)]">街区范围（scope）</div>
                <div className="mt-2">
                  <Input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="例如：prod / edge 或 k8s:namespace=foo" />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--px-muted)]">图纸仓库（repo）</div>
                <div className="mt-2">
                  <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="例如：git@company:platform/iac.git" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate('/map')}>
                <ArrowLeft className="h-4 w-4" /> 回地图
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateWorkshop(change.id, { scope: scope.trim() || change.workshop.scope, repo: repo.trim() || change.workshop.repo, step: 'scan' })
                  runWorkshopScan(change.id)
                }}
              >
                <Play className="h-4 w-4" /> 城市普查
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateWorkshop(change.id, { step: 'generate' })
                  runWorkshopGenerate(change.id)
                }}
                disabled={step === 'select'}
              >
                <Sparkles className="h-4 w-4" /> 生成蓝图/整改
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateWorkshop(change.id, { step: 'preview' })
                }}
                disabled={step === 'select' || step === 'scan'}
              >
                预览图纸
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  completeWorkshop(change.id)
                  navigate(`/changes/${change.id}`)
                }}
                disabled={!canGoReview}
              >
                进入审批大厅
              </Button>
            </div>
          </div>

          <WorkshopSteps step={change.workshop.step} />
        </div>

        <div className="space-y-3">
          <InventoryPanel change={change} onChangeInventory={(inventory) => updateWorkshop(change.id, { inventory })} />
          <ArtifactPanel change={change} />
        </div>

        <div className="space-y-3">
          <div className="px-panel p-3">
            <div className="text-sm font-semibold">下一步提示</div>
            <div className="mt-2 text-sm text-[var(--px-text)]">
              {change.workshop.step === 'select'
                ? '先确定街区范围与图纸仓库，再做城市普查生成清单。'
                : change.workshop.step === 'scan'
                  ? '标记哪些建筑要纳入托管，然后生成/同步蓝图。'
                  : change.workshop.step === 'generate'
                    ? '已生成蓝图工程或整改补丁，可进入预览检查高风险文件。'
                    : change.workshop.step === 'preview'
                      ? '确认输出无误后进入审批大厅，通过闸门再施工。'
                      : '工坊完成：进入审批大厅推进到施工指挥与战报。'}
            </div>
          </div>

          <div className="px-panel p-3">
            <div className="text-sm font-semibold">风险 / 成本（预估）</div>
            <div className="mt-2 text-xs text-[var(--px-muted)]">基于工坊生成的资源变化与风险标签做的快速估算。</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={change.workshop.artifact?.kind === 'patch' ? 'warn' : 'neutral'}>
                输出：{change.workshop.artifact?.kind ?? 'pending'}
              </Badge>
              <Badge tone={change.resources.some((r) => r.action === 'delete') ? 'bad' : 'good'}>
                删除项：{change.resources.filter((r) => r.action === 'delete').length}
              </Badge>
              <Badge tone={change.resources.some((r) => r.riskTags.includes('iam')) ? 'warn' : 'neutral'}>
                IAM：{change.resources.filter((r) => r.riskTags.includes('iam')).length}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
