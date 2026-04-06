import { create } from 'zustand'
import { projectionForGenerate, projectionForScan, type ProjectionEvent } from '../utils/projection'
import type { DeployKitEvent } from '../runtime/deploykit/types'

export type AgentStatus = 'idle' | 'working' | 'thinking' | 'blocked' | 'done'
export type AgentRole = 'scanner' | 'generator' | 'reviewer'

export interface WorkerAgent {
  id: string
  role: AgentRole
  name: string
  icon: string
  status: AgentStatus
  currentTask: string
}

export interface LedgerEntry {
  id: string
  timestamp: number
  agentId: string
  agentName: string
  message: string
  type: 'info' | 'success' | 'warn' | 'error'
}

export type EnvName = 'dev' | 'stage' | 'prod'

export type TaskScenario = 'live_to_iac' | 'live_and_iac_to_sync' | 'new_to_iac'

export type ChangeStatus =
  | 'draft'
  | 'in_workshop'
  | 'in_review'
  | 'approved'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rolled_back'

export type ResourceAction = 'create' | 'update' | 'delete'

export type RiskTag =
  | 'delete'
  | 'iam'
  | 'network'
  | 'data'
  | 'blast_radius'

export type ResourceChange = {
  id: string
  action: ResourceAction
  type: string
  name: string
  summary: string
  costDeltaMonthlyUsd: number
  riskTags: RiskTag[]
}

export type ReviewComment = {
  id: string
  author: string
  createdAt: number
  body: string
}

export type InventoryMark = 'managed' | 'ignored' | 'readonly'

export type InventoryItem = {
  id: string
  type: string
  name: string
  mark: InventoryMark
  drift: 'none' | 'changed' | 'missing' | 'extra'
}

export type IaCFileChange = 'add' | 'modify' | 'delete'

export type IaCArtifact = {
  kind: 'project' | 'patch'
  summary: string
  files: { path: string; change: IaCFileChange }[]
}

export type WorkshopStep = 'select' | 'scan' | 'generate' | 'preview' | 'complete'

export type WorkshopState = {
  step: WorkshopStep
  scope: string
  repo: string
  inventory: InventoryItem[]
  artifact: IaCArtifact | null
  updatedAt: number
}

export type ActiveWorkflowState = {
  sessionId: string
  workflowId: string
  workflowName: string
  totalSkills: number
  currentSkillId: string | null
  currentSkillName: string | null
  status: 'idle' | 'running' | 'waiting_approval' | 'succeeded' | 'failed'
}

export type ChangePlacement = {
  x: number
  y: number
  zone: EnvName
}

export type DeployChange = {
  id: string
  title: string
  env: EnvName
  scenario: TaskScenario
  createdAt: number
  createdBy: string
  status: ChangeStatus
  workshop: WorkshopState
  resources: ResourceChange[]
  notes: string
  comments: ReviewComment[]
  placement?: ChangePlacement
}

export type RunStep = 'syntax' | 'plan' | 'test_deploy' | 'prod_canary' | 'verify' | 'complete'

export type RunStatus =
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rollback_running'
  | 'rolled_back'

export type RunLogLevel = 'info' | 'warn' | 'error'

export type RunLogLine = {
  id: string
  at: number
  level: RunLogLevel
  message: string
}

export type DeployRun = {
  id: string
  changeId: string
  env: EnvName
  createdAt: number
  createdBy: string
  status: RunStatus
  currentStep: RunStep
  progress: number
  logs: RunLogLine[]
  outcome: 'success' | 'failure'
  rollbackAvailable: boolean
}

function now() {
  return Date.now()
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function inv(type: string, name: string, mark: InventoryMark, drift: InventoryItem['drift']): InventoryItem {
  return { id: uid('inv'), type, name, mark, drift }
}

function seedChanges(): DeployChange[] {
  const createdBy = 'you@demo.local'
  const createdAt = now() - 1000 * 60 * 24

  return [
    {
      id: 'chg_001',
      title: 'Prod：开启 WAF 与限流策略',
      env: 'prod',
      scenario: 'live_and_iac_to_sync',
      createdAt,
      createdBy,
      status: 'in_review',
      workshop: {
        step: 'complete',
        scope: 'prod / edge',
        repo: 'git@demo.local:platform/iac.git',
        inventory: [
          inv('aws_cloudfront_distribution', 'cdn_main', 'managed', 'changed'),
          inv('aws_wafv2_web_acl', 'edge_waf', 'managed', 'extra'),
          inv('aws_ssm_parameter', 'rate_limit_threshold', 'managed', 'changed'),
          inv('aws_iam_role', 'edge_role', 'readonly', 'none'),
          inv('aws_cloudwatch_alarm', 'edge_5xx_alarm', 'managed', 'none'),
          inv('aws_security_group', 'edge_sg', 'readonly', 'none'),
          inv('kubernetes_ingress_v1', 'edge_ingress', 'managed', 'none'),
          inv('kubernetes_config_map', 'edge_rules', 'managed', 'changed'),
        ],
        artifact: {
          kind: 'patch',
          summary: '检测到 drift：新增 WAF 绑定与限流策略，将以最小 patch 对齐 IaC。',
          files: [
            { path: 'modules/edge/waf.tf', change: 'modify' },
            { path: 'modules/edge/cdn.tf', change: 'modify' },
            { path: 'environments/prod/edge.tfvars', change: 'modify' },
          ],
        },
        updatedAt: createdAt + 1000 * 60 * 9,
      },
      notes: '目标：降低流量异常带来的风险。窗口：周二 10:00-10:15。',
      comments: [
        {
          id: 'cmt_001',
          author: 'reviewer@demo.local',
          createdAt: createdAt + 1000 * 60 * 6,
          body: '限流阈值是按峰值还是按均值？请补充回滚策略。'
        }
      ],
      resources: [
        {
          id: 'rc_001',
          action: 'create',
          type: 'aws_wafv2_web_acl',
          name: 'edge_waf',
          summary: '新增 Web ACL，包含基础防护与 Bot 控制。',
          costDeltaMonthlyUsd: 52,
          riskTags: ['network', 'blast_radius']
        },
        {
          id: 'rc_002',
          action: 'update',
          type: 'aws_cloudfront_distribution',
          name: 'cdn_main',
          summary: '绑定 WAF，调整缓存行为与限流规则。',
          costDeltaMonthlyUsd: 8,
          riskTags: ['network']
        }
      ],
      placement: { x: 560, y: 120, zone: 'prod' }
    },
    {
      id: 'chg_002',
      title: 'Stage：升级 RDS 实例规格',
      env: 'stage',
      scenario: 'new_to_iac',
      createdAt: createdAt - 1000 * 60 * 40,
      createdBy,
      status: 'draft',
      workshop: {
        step: 'select',
        scope: 'stage / db',
        repo: 'git@demo.local:platform/iac.git',
        inventory: [
          inv('aws_db_instance', 'app_db', 'managed', 'none'),
          inv('aws_kms_key', 'db_kms', 'readonly', 'none'),
          inv('aws_cloudwatch_alarm', 'db_cpu_alarm', 'managed', 'none'),
          inv('aws_ssm_parameter', 'db_maintenance_window', 'managed', 'none'),
        ],
        artifact: null,
        updatedAt: createdAt - 1000 * 60 * 40,
      },
      notes: '从 db.t3.medium 升级到 db.t3.large，观察 24h。',
      comments: [],
      resources: [
        {
          id: 'rc_003',
          action: 'update',
          type: 'aws_db_instance',
          name: 'app_db',
          summary: '提升 CPU/内存，计划维护窗口执行。',
          costDeltaMonthlyUsd: 110,
          riskTags: ['data']
        }
      ],
      placement: { x: 340, y: 260, zone: 'stage' }
    },
    {
      id: 'chg_003',
      title: 'Dev：清理过期的 IAM Policy',
      env: 'dev',
      scenario: 'live_to_iac',
      createdAt: createdAt - 1000 * 60 * 130,
      createdBy,
      status: 'approved',
      workshop: {
        step: 'complete',
        scope: 'dev / iam',
        repo: 'git@demo.local:platform/iac.git',
        inventory: [
          inv('aws_iam_role', 'ci_role', 'managed', 'none'),
          inv('aws_iam_policy', 'legacy_ci_policy', 'managed', 'extra'),
          inv('aws_iam_policy', 'build_policy', 'managed', 'none'),
          inv('aws_cloudwatch_log_group', 'ci_logs', 'managed', 'none'),
          inv('aws_ssm_parameter', 'ci_allowed_buckets', 'managed', 'changed'),
        ],
        artifact: {
          kind: 'project',
          summary: '从现网导入 IAM 资源并生成 IaC 模块，删除策略将通过评审后执行。',
          files: [
            { path: 'modules/iam/main.tf', change: 'add' },
            { path: 'modules/iam/outputs.tf', change: 'add' },
            { path: 'modules/iam/policies.tf', change: 'add' },
          ],
        },
        updatedAt: createdAt - 1000 * 60 * 110,
      },
      notes: '减少权限漂移；若业务报错，立即恢复。',
      comments: [
        {
          id: 'cmt_002',
          author: 'reviewer@demo.local',
          createdAt: createdAt - 1000 * 60 * 90,
          body: '删除前请确认没有绑定到当前 CI Role。'
        }
      ],
      resources: [
        {
          id: 'rc_004',
          action: 'delete',
          type: 'aws_iam_policy',
          name: 'legacy_ci_policy',
          summary: '删除过期策略（曾授权 s3:*）。',
          costDeltaMonthlyUsd: 0,
          riskTags: ['delete', 'iam']
        },
        {
          id: 'rc_005',
          action: 'update',
          type: 'aws_iam_role',
          name: 'ci_role',
          summary: '移除对 legacy policy 的 attachment。',
          costDeltaMonthlyUsd: 0,
          riskTags: ['iam']
        },
        {
          id: 'rc_006',
          action: 'update',
          type: 'aws_ssm_parameter',
          name: 'ci_allowed_buckets',
          summary: '同步“允许访问的仓库清单”参数，避免权限漂移。',
          costDeltaMonthlyUsd: 0,
          riskTags: []
        }
      ],
      placement: { x: 140, y: 380, zone: 'dev' }
    }
  ]
}

function loadJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const DEMO_USER = { email: 'operator@demo.local' }

type DeployState = {
  envFocus: EnvName
  selectedChangeId: string | null
  activeWorkflow: ActiveWorkflowState | null
  changes: DeployChange[]
  runs: DeployRun[]
  agents: WorkerAgent[]
  ledger: LedgerEntry[]
  refineryQueue: number
  projectionEvents: ProjectionEvent[]

  dispatchAgents: (
    taskType: 'scan' | 'generate',
    subAgents: { id: string; name: string; task: string; duration: number }[],
    onAllComplete: () => void
  ) => void
  addLedgerEntry: (agentId: string, message: string, type?: LedgerEntry['type']) => void
  approveRefinery: () => void
  pushProjectionEvents: (events: ProjectionEvent[]) => void
  gcProjectionEvents: (now: number) => void
  projectScan: (changeId: string) => void
  projectGenerate: (changeId: string) => void

  setEnvFocus: (env: EnvName) => void
  selectChange: (id: string | null) => void
  resetDemoData: () => void
  createTask: (input: {
    title: string
    env: EnvName
    scenario: TaskScenario
    createdBy: string
    scope?: string
    repo?: string
  }) => string
  placeChange: (id: string, placement: ChangePlacement) => void
  updateWorkshop: (id: string, patch: Partial<WorkshopState>) => void
  runWorkshopScan: (id: string) => void
  runWorkshopGenerate: (id: string) => void
  completeWorkshop: (id: string) => void
  addComment: (id: string, input: { author: string; body: string }) => void
  approveChange: (id: string) => void
  rejectChange: (id: string) => void
  startRun: (input: { changeId: string; createdBy: string }) => string
  tickRun: (runId: string) => void
  triggerRollback: (runId: string) => void
  completeRollback: (runId: string) => void
  ingestDeployKitEvent: (event: DeployKitEvent) => void
}

const initialChanges = loadJson<DeployChange[]>('px_changes') ?? seedChanges()
const initialRuns = loadJson<DeployRun[]>('px_runs') ?? []

export const mockOpenCodeApi = {
  fetchAgentsForTask: async (taskType: 'scan' | 'generate') => {
    // Simulate network delay to fetch OpenCode agents
    await new Promise(r => setTimeout(r, 600))
    if (taskType === 'scan') {
      return [
        { id: `opencode_scan_1_${Date.now()}`, name: 'OpenCode-VPCScanner', task: '> 扫描 VPC / SG / Network...', duration: 1800 },
        { id: `opencode_scan_2_${Date.now()}`, name: 'OpenCode-DBScanner', task: '> 扫描 RDS / Redis / Storage...', duration: 2500 },
        { id: `opencode_scan_3_${Date.now()}`, name: 'OpenCode-AppScanner', task: '> 扫描 API Gateway / ECS...', duration: 2100 },
        { id: `opencode_scan_4_${Date.now()}`, name: 'OpenCode-IAMScanner', task: '> 扫描 IAM / Roles...', duration: 1500 },
      ]
    } else {
      return [
        { id: `opencode_gen_1_${Date.now()}`, name: 'OpenCode-DiffAnalyzer', task: '> 对比现网与 State...', duration: 1500 },
        { id: `opencode_gen_2_${Date.now()}`, name: 'OpenCode-TerraformWriter', task: '> 编写 Terraform Patch...', duration: 3200 },
        { id: `opencode_gen_3_${Date.now()}`, name: 'OpenCode-SecurityChecker', task: '> 校验合规性与 Least Privilege...', duration: 2800 },
      ]
    }
  }
}

export const useDeployStore = create<DeployState>((set, get) => ({
  envFocus: 'prod',
  selectedChangeId: null,
  activeWorkflow: null,
  changes: initialChanges,
  runs: initialRuns,
  agents: [
    { id: 'ag_rev', role: 'reviewer', name: '安检员', icon: '👮', status: 'idle', currentTask: 'Zzz...', position: { mapX: 900, mapY: 300 } },  // Office position
  ],
  ledger: [],
  refineryQueue: 0,
  projectionEvents: [],

  addLedgerEntry: (agentId, message, type = 'info') =>
    set((s) => {
      const agent = s.agents.find((a) => a.id === agentId)
      const entry: LedgerEntry = {
        id: uid('log'),
        timestamp: Date.now(),
        agentId,
        agentName: agent?.name ?? 'System',
        message,
        type,
      }
      return { ledger: [...s.ledger, entry] }
    }),

  pushProjectionEvents: (events) => set((s) => ({ projectionEvents: [...s.projectionEvents, ...events] })),
  gcProjectionEvents: (now) =>
    set((s) => ({
      projectionEvents: s.projectionEvents.filter((e) => now - e.at < (e.durationMs ?? 3000) + 1500),
    })),

  projectScan: (changeId) => {
    const at = Date.now()
    const ch = get().changes.find((c) => c.id === changeId)
    if (!ch) return
    const events = projectionForScan({ at, change: ch, inventory: ch.workshop.inventory })
    get().pushProjectionEvents(events)
  },

  projectGenerate: (changeId) => {
    const at = Date.now()
    const ch = get().changes.find((c) => c.id === changeId)
    if (!ch) return
    const events = projectionForGenerate({ at, change: ch, resources: ch.resources })
    get().pushProjectionEvents(events)
  },

  dispatchAgents: (taskType, subAgents, onAllComplete) => {
    const s = get()
    
    // Spawn new agents
    const newWorkers: WorkerAgent[] = subAgents.map(sa => ({
      id: sa.id,
      role: taskType === 'scan' ? 'scanner' : 'generator',
      name: sa.name,
      icon: taskType === 'scan' ? '🕵️' : '👨‍🎨',
      status: 'working',
      currentTask: sa.task,
      position: { mapX: 900, mapY: 300 }  // Start at office
    }))

    set((state) => ({
      agents: [...state.agents, ...newWorkers]
    }))

    // Log dispatch
    s.addLedgerEntry('ag_rev', `Dispatched ${subAgents.length} sub-agents for ${taskType}.`, 'info')

    let completedCount = 0

    // Simulate concurrent work
    subAgents.forEach(sa => {
      s.addLedgerEntry(sa.id, `Started: ${sa.task}`, 'info')
      
      setTimeout(() => {
        set((state) => ({
          agents: state.agents.map(a => a.id === sa.id ? { ...a, status: 'done', currentTask: '✅ 完成' } : a)
        }))
        get().addLedgerEntry(sa.id, `Completed: ${sa.task}`, 'success')
        
        completedCount++
        if (completedCount === subAgents.length) {
          // All done, send to Refinery
          const rev = get().agents.find(a => a.role === 'reviewer')
          set((state) => ({
            refineryQueue: state.refineryQueue + 1,
            agents: state.agents.map(a => a.id === rev?.id ? { ...a, status: 'thinking', currentTask: 'Checking compliance...' } : a)
          }))
          
          setTimeout(() => {
            set((state) => ({
              agents: state.agents.map(a => a.id === rev?.id ? { ...a, status: 'idle', currentTask: 'Awaiting Signature' } : a)
            }))
            get().addLedgerEntry('ag_rev', 'Batch inspection complete. Ready for approval.', 'warn')
            onAllComplete()
          }, 1200)
          
          // Cleanup old agents after a delay
          setTimeout(() => {
             set((state) => ({
               agents: state.agents.filter(a => a.role === 'reviewer' || a.status !== 'done')
             }))
          }, 4000)
        }
      }, sa.duration)
    })
  },

  approveRefinery: () =>
    set((s) => {
      s.addLedgerEntry('ag_rev', 'Approved by Mayor.', 'success')
      return { refineryQueue: Math.max(0, s.refineryQueue - 1) }
    }),

  setEnvFocus: (env) => set(() => ({ envFocus: env })),
  selectChange: (id) => set(() => ({ selectedChangeId: id })),

  resetDemoData: () =>
    set((s) => {
      localStorage.removeItem('px_changes')
      localStorage.removeItem('px_runs')
      const changes = seedChanges()
      const runs: DeployRun[] = []
      saveJson('px_changes', changes)
      saveJson('px_runs', runs)
      return { ...s, selectedChangeId: null, activeWorkflow: null, changes, runs }
    }),

  createTask: ({ title, env, scenario, createdBy, scope, repo }) => {
    const id = uid('chg')
    const t = now()
    set((s) => {
      const changes: DeployChange[] = [
        {
          id,
          title,
          env,
          scenario,
          createdAt: t,
          createdBy,
          status: 'in_workshop',
          workshop: {
            step: 'select',
            scope: scope ?? `${env} / core`,
            repo: repo ?? 'git@demo.local:platform/iac.git',
            inventory: [],
            artifact: null,
            updatedAt: t,
          },
          resources: [],
          notes: '在 IaC 工坊完成扫描/生成/同步后，再进入评审关卡。',
          comments: [],
        },
        ...s.changes
      ]
      saveJson('px_changes', changes)
      return { changes }
    })
    return id
  },

  updateWorkshop: (id, patch) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) =>
        c.id === id ? { ...c, workshop: { ...c.workshop, ...patch, updatedAt: now() } } : c
      )
      saveJson('px_changes', changes)
      return { changes }
    }),

  runWorkshopScan: (id) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => {
        if (c.id !== id) return c
        const sync = c.scenario === 'live_and_iac_to_sync'
        const inventory: InventoryItem[] = [
          inv('aws_cloudfront_distribution', 'cdn_main', 'managed', sync ? 'changed' : 'none'),
          inv('aws_wafv2_web_acl', 'edge_waf', 'managed', sync ? 'extra' : 'none'),
          inv('aws_s3_bucket', 'artifact_bucket', 'managed', 'none'),
          inv('aws_iam_role', 'build_role', 'managed', sync ? 'changed' : 'none'),
          inv('aws_iam_policy', 'build_policy', 'readonly', sync ? 'missing' : 'none'),
          inv('aws_security_group', 'svc_sg', 'readonly', sync ? 'extra' : 'none'),
          inv('aws_cloudwatch_log_group', 'svc_logs', 'managed', 'none'),
          inv('aws_cloudwatch_alarm', 'svc_5xx_alarm', 'managed', sync ? 'changed' : 'none'),
          inv('aws_ssm_parameter', 'feature_flags', 'managed', sync ? 'changed' : 'none'),
          inv('kubernetes_config_map', 'svc_config', 'managed', sync ? 'changed' : 'none'),
        ]
        return {
          ...c,
          workshop: { ...c.workshop, step: 'scan', inventory, artifact: null, updatedAt: now() },
        }
      })
      saveJson('px_changes', changes)
      return { changes }
    }),

  runWorkshopGenerate: (id) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => {
        if (c.id !== id) return c
        const artifact: IaCArtifact =
          c.scenario === 'live_and_iac_to_sync'
            ? {
                kind: 'patch',
                summary: '基于现网与 IaC 的差异生成最小 patch（含 drift 分类与风险提示）。',
                files: [
                  { path: 'modules/core/main.tf', change: 'modify' },
                  { path: 'modules/core/variables.tf', change: 'modify' },
                  { path: 'policies/prod/change-window.rego', change: 'modify' },
                ],
              }
            : {
                kind: 'project',
                summary: '生成 IaC 工程骨架与模块文件（可下载/写入仓库）。',
                files: [
                  { path: 'modules/core/main.tf', change: 'add' },
                  { path: 'modules/core/variables.tf', change: 'add' },
                  { path: 'environments/' + c.env + '/main.tf', change: 'add' },
                  { path: 'policies/base/least-privilege.rego', change: 'add' },
                ],
              }

        const resources: ResourceChange[] =
          c.scenario === 'new_to_iac'
            ? [
                {
                  id: uid('rc'),
                  action: 'create',
                  type: 'aws_db_instance',
                  name: 'app_db',
                  summary: '新增/初始化数据库实例（模板化参数）。',
                  costDeltaMonthlyUsd: 120,
                  riskTags: ['data', 'blast_radius'],
                },
                {
                  id: uid('rc'),
                  action: 'create',
                  type: 'aws_cloudwatch_alarm',
                  name: 'db_cpu_alarm',
                  summary: '为数据库新增告警与阈值建议（模板化）。',
                  costDeltaMonthlyUsd: 2,
                  riskTags: [],
                },
              ]
            : [
                {
                  id: uid('rc'),
                  action: c.scenario === 'live_and_iac_to_sync' ? 'update' : 'create',
                  type: 'aws_s3_bucket',
                  name: 'artifact_bucket',
                  summary: '对齐/生成存储桶配置（版本控制/加密）。',
                  costDeltaMonthlyUsd: 3,
                  riskTags: ['data'],
                },
                {
                  id: uid('rc'),
                  action: c.scenario === 'live_and_iac_to_sync' ? 'update' : 'create',
                  type: 'aws_iam_role',
                  name: 'build_role',
                  summary: '对齐/生成构建角色权限与最小授权建议。',
                  costDeltaMonthlyUsd: 0,
                  riskTags: ['iam'],
                },
                {
                  id: uid('rc'),
                  action: c.scenario === 'live_and_iac_to_sync' ? 'update' : 'create',
                  type: 'aws_cloudwatch_log_group',
                  name: 'svc_logs',
                  summary: '补齐日志设施与保留策略，便于验收与追责。',
                  costDeltaMonthlyUsd: 1,
                  riskTags: [],
                },
                {
                  id: uid('rc'),
                  action: c.scenario === 'live_and_iac_to_sync' ? 'update' : 'create',
                  type: 'aws_ssm_parameter',
                  name: 'feature_flags',
                  summary: '把运行参数纳入文书系统（参数库），避免人工改动漂移。',
                  costDeltaMonthlyUsd: 0,
                  riskTags: [],
                },
              ]

        return {
          ...c,
          workshop: { ...c.workshop, step: 'generate', artifact, updatedAt: now() },
          resources,
          notes: artifact.kind === 'patch' ? '已生成 IaC patch，进入关卡评审风险与合并策略。' : '已生成 IaC 工程，进入关卡评审风险与发布窗口。',
        }
      })
      saveJson('px_changes', changes)
      return { changes }
    }),

  completeWorkshop: (id) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) =>
        c.id === id
          ? { ...c, status: 'in_review', workshop: { ...c.workshop, step: 'complete', updatedAt: now() } }
          : c
      )
      saveJson('px_changes', changes)
      return { changes }
    }),

  placeChange: (id, placement) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => (c.id === id ? { ...c, placement } : c))
      saveJson('px_changes', changes)
      return { changes }
    }),

  addComment: (id, input) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => {
        if (c.id !== id) return c
        const next: ReviewComment = {
          id: uid('cmt'),
          author: input.author,
          createdAt: now(),
          body: input.body
        }
        return { ...c, comments: [...c.comments, next] }
      })
      saveJson('px_changes', changes)
      return { changes }
    }),

  approveChange: (id) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => (c.id === id ? { ...c, status: 'approved' as const } : c))
      saveJson('px_changes', changes)
      return { changes }
    }),

  rejectChange: (id) =>
    set((s) => {
      const changes: DeployChange[] = s.changes.map((c) => (c.id === id ? { ...c, status: 'draft' as const } : c))
      saveJson('px_changes', changes)
      return { changes }
    }),

  startRun: ({ changeId, createdBy }) => {
    const change = get().changes.find((c) => c.id === changeId)
    if (!change) return ''

    const riskWeight = change.resources.reduce((acc, r) => acc + (r.riskTags.includes('delete') ? 2 : 0) + (r.riskTags.includes('iam') ? 1 : 0), 0)
    const outcome: DeployRun['outcome'] = Math.random() < Math.max(0.15, 0.8 - riskWeight * 0.12) ? 'success' : 'failure'

    const runId = uid('run')
    const run: DeployRun = {
      id: runId,
      changeId,
      env: change.env,
      createdAt: now(),
      createdBy,
      status: 'running',
      currentStep: 'syntax',
      progress: 0,
      outcome,
      rollbackAvailable: true,
      logs: [
        { id: uid('log'), at: now(), level: 'info', message: `图纸审查：${change.env}（初始化工地）` },
        { id: uid('log'), at: now(), level: 'info', message: '图纸审查：通过（模拟）' }
      ]
    }

    set((s) => {
      const runs: DeployRun[] = [run, ...s.runs]
      const changes: DeployChange[] = s.changes.map((c) => (c.id === changeId ? { ...c, status: 'running' as const } : c))
      saveJson('px_runs', runs)
      saveJson('px_changes', changes)
      return { runs, changes }
    })
    return runId
  },

  tickRun: (runId) =>
    set((s) => {
      const run = s.runs.find((r) => r.id === runId)
      if (!run) return s
      if (run.status !== 'running') return s

      const nextProgress = Math.min(100, run.progress + 12)
      let currentStep: RunStep = run.currentStep
      let logs = run.logs
      const stepAt = (pct: number, step: RunStep, line: RunLogLine) => {
        if (run.progress < pct && nextProgress >= pct) {
          currentStep = step
          logs = [...logs, line]
        }
      }

      stepAt(12, 'plan', { id: uid('log'), at: now(), level: 'info', message: '施工评估：生成 plan 并评估风险/预算…' })
      stepAt(35, 'test_deploy', { id: uid('log'), at: now(), level: 'info', message: '沙盘施工：在沙盘城落地并收集指标…' })
      stepAt(65, 'prod_canary', { id: uid('log'), at: now(), level: 'warn', message: '试通车：主城灰度窗口开启（模拟）。' })
      stepAt(82, 'verify', { id: uid('log'), at: now(), level: 'info', message: '竣工验收：健康检查/漂移复核/回撤预案确认…' })

      const isCompleting = nextProgress >= 100

      let status: RunStatus = run.status
      if (isCompleting) {
        currentStep = 'complete'
        status = run.outcome === 'success' ? 'succeeded' : 'failed'
        logs = [
          ...logs,
          run.outcome === 'success'
            ? { id: uid('log'), at: now(), level: 'info', message: '竣工：所有设施已按计划交付。' }
            : { id: uid('log'), at: now(), level: 'error', message: '事故：权限不足或依赖顺序不满足（模拟）。' }
        ]
      }

      const runs: DeployRun[] = s.runs.map((r) =>
        r.id === runId ? { ...r, progress: nextProgress, currentStep, status, logs } : r
      )

      const changeId = run.changeId
      const changes: DeployChange[] = s.changes.map((c) => {
        if (c.id !== changeId) return c
        if (status === 'succeeded') return { ...c, status: 'succeeded' as const }
        if (status === 'failed') return { ...c, status: 'failed' as const }
        return c
      })

      saveJson('px_runs', runs)
      saveJson('px_changes', changes)
      return { ...s, runs, changes }
    }),

  triggerRollback: (runId) =>
    set((s) => {
      const run = s.runs.find((r) => r.id === runId)
      if (!run) return s
      if (!run.rollbackAvailable) return s

      const runs: DeployRun[] = s.runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              status: 'rollback_running' as const,
              logs: [...r.logs, { id: uid('log'), at: now(), level: 'warn', message: '开始回滚：以最后一次稳定状态为目标…' }]
            }
          : r
      )

      saveJson('px_runs', runs)
      return { ...s, runs }
    }),

  completeRollback: (runId) =>
    set((s) => {
      const run = s.runs.find((r) => r.id === runId)
      if (!run) return s
      if (run.status !== 'rollback_running') return s

      const runs: DeployRun[] = s.runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              status: 'rolled_back' as const,
              rollbackAvailable: false,
              logs: [...r.logs, { id: uid('log'), at: now(), level: 'info', message: '回滚完成：已恢复到稳定状态（模拟）。' }]
            }
          : r
      )

      const changes: DeployChange[] = s.changes.map((c) => (c.id === run.changeId ? { ...c, status: 'rolled_back' as const } : c))
      saveJson('px_runs', runs)
      saveJson('px_changes', changes)
      return { ...s, runs, changes }
    }),

  ingestDeployKitEvent: (event) =>
    set((s) => {
      if (event.kind === 'workflow_selected') {
        return {
          activeWorkflow: {
            sessionId: event.sessionId,
            workflowId: event.workflowId,
            workflowName: event.workflowName,
            totalSkills: event.totalSkills,
            currentSkillId: null,
            currentSkillName: null,
            status: 'idle',
          },
        }
      }

      if (!s.activeWorkflow || s.activeWorkflow.workflowId !== event.workflowId) {
        return {}
      }

      if (event.kind === 'skill_started') {
        return {
          activeWorkflow: {
            ...s.activeWorkflow,
            currentSkillId: event.skillId,
            currentSkillName: event.skillName,
            status: 'running',
          },
        }
      }

      if (event.kind === 'skill_completed') {
        return {
          activeWorkflow: {
            ...s.activeWorkflow,
            currentSkillId: event.skillId,
            status: 'running',
          },
        }
      }

      if (event.kind === 'approval_required') {
        return {
          activeWorkflow: {
            ...s.activeWorkflow,
            status: 'waiting_approval',
          },
        }
      }

      if (event.kind === 'workflow_completed') {
        return {
          activeWorkflow: {
            ...s.activeWorkflow,
            currentSkillId: null,
            currentSkillName: null,
            status: event.status === 'success' ? 'succeeded' : 'failed',
          },
        }
      }

      return {}
    }),
}))

