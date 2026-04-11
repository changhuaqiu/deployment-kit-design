# Agent个性化 + 实时工作动画设计文档

**Date:** 2026-04-07
**Status:** Design Approved
**Related Specs:** [OpenCode Integration Blueprint](./2026-04-06-opencode-integration-blueprint.md)

---

## 1. Overview

### 1.1 目标

为Pixel Office CityHud创建一个**生动有趣的办公场景**，让OpenCode agents具有鲜明个性，实时展示他们在城市地图上的工作过程，并允许用户与agents进行社交互动。

### 1.2 核心特性

1. **Agent个性化系统**: 每个agent拥有独特的性格特质、工作风格和人际网络
2. **实时工作动画**: Agents在city map上执行扫描、建造、审批等任务的视觉化呈现
3. **动画事件队列**: 基于优先级的动画调度系统，确保关键事件优先展示
4. **办公互动**: 用户可与agents打招呼、送咖啡、查看工作历史

### 1.3 架构原则

- **Runtime层与UI层分离**: Runtime层处理事件，UI层专注于渲染
- **Store分离**: `deployStore`管理业务态，`runtimeStore`管理实时态
- **投影模式**: Projectors将OpenCode事件映射到agent状态和动画事件

---

## 2. Agent Personality System

### 2.1 Personality Data Structure

```typescript
interface AgentPersonality {
  // 性格特质
  trait: 'perfectionist' | 'artistic' | 'strict' | 'relaxed'

  // 个人怪癖（随机2-3个）
  quirks: string[]

  // 工作风格
  workStyle: 'fast' | 'thorough' | 'creative'

  // 与其他agents的关系值 (-100 to 100)
  relationships: Record<string, number>

  // 工作统计
  stats: {
    deploymentsCompleted: number
    deploymentsRejected: number
    averageSpeed: number // seconds per task
  }

  // 偏好设置
  preferences: {
    favoriteBuilding?: string // 最喜欢去的建筑
    coffeePreference: 'black' | 'latte' | 'cappuccino'
    breakFrequency: number // minutes between breaks
  }
}
```

### 2.2 Personality Types

#### Perfectionist (完美主义者)

**特征**: 追求零错误，反复检查工作

**工作行为**:
- Task完成后有20%概率触发"再检查一遍"对话
- 工作时长比其他agents长30%
- Deployments rejected率低（<5%）

**对话示例**:
```
完成任务后: "让我再检查一遍... 确保没有遗漏。"
发现潜在问题: "这里有个边缘情况需要考虑。"
```

#### Artistic (艺术家型)

**特征**: 追求代码优雅，注重可读性

**工作行为**:
- 花额外时间重构代码
- 喜欢在comment里加emoji
- 工作时偶尔会"停下来思考"

**对话示例**:
```
完成任务后: "这个方案很优雅，对吧？🎨"
重构时: "这个函数可以写得更简洁。"
```

#### Strict (严格型)

**特征**: 强调合规性，流程优先

**工作行为**:
- 严格遵循checklist
- 审批时仔细review每个risk
- 压力大时喝茶解压

**对话示例**:
```
审批时: "需要评估安全风险。"
检查合规性: "这个配置符合production标准吗？"
压力大时: "喝口茶继续... 🍵"
```

#### Relaxed (轻松型)

**特征**: 工作节奏稳定，善于化解压力

**工作行为**:
- 工作速度适中
- 喜欢与同事交流
- 休息时间规律

**对话示例**:
```
完成任务后: "搞定了！休息一下~"
与同事交流: "嘿，最近怎么样？"
```

### 2.3 Personality Configuration Examples

```typescript
// Scanner #1 - Perfectionist
{
  id: 'scanner-1',
  name: '普查员 #1',
  role: 'SCANNER',
  icon: '🕵️',
  personality: {
    trait: 'perfectionist',
    quirks: ['收集放大镜', '反复检查'],
    workStyle: 'thorough',
    relationships: {
      'planner-1': 30,
      'monitor-1': 20
    },
    stats: {
      deploymentsCompleted: 45,
      deploymentsRejected: 2,
      averageSpeed: 180
    },
    preferences: {
      favoriteBuilding: 'data-center',
      coffeePreference: 'black',
      breakFrequency: 60
    }
  }
}

// Planner #1 - Artistic
{
  id: 'planner-1',
  name: '规划师 #1',
  role: 'PLANNER',
  icon: '👨‍🎨',
  personality: {
    trait: 'artistic',
    quirks: ['追求优雅', '喜欢emoji'],
    workStyle: 'creative',
    relationships: {
      'scanner-1': 30,
      'monitor-1': 40
    },
    stats: {
      deploymentsCompleted: 38,
      deploymentsRejected: 5,
      averageSpeed: 240
    },
    preferences: {
      coffeePreference: 'latte',
      breakFrequency: 45
    }
  }
}

// Monitor #1 - Strict
{
  id: 'monitor-1',
  name: '审核员 #1',
  role: 'MONITOR',
  icon: '👮',
  personality: {
    trait: 'strict',
    quirks: ['喝茶解压', '严格review'],
    workStyle: 'thorough',
    relationships: {
      'scanner-1': 20,
      'planner-1': 40
    },
    stats: {
      deploymentsCompleted: 52,
      deploymentsRejected: 8,
      averageSpeed: 200
    },
    preferences: {
      coffeePreference: 'cappuccino',
      breakFrequency: 30
    }
  }
}
```

---

## 3. Real-Time Work Animations

### 3.1 Animation Types

#### Type 1: Scan (扫描)

**触发时机**: `tool.started` with tool name containing 'scan' or 'validate'

**动画效果**:
1. 扫描波纹从建筑中心向外扩散
2. 颜色变化: 蓝色(进行中) → 橙色(发现) → 绿色(完成)
3. 持续时长: 2-3秒

**实现**:
```typescript
function playScanAnimation(buildingId: string, ctx: CanvasRenderingContext2D) {
  const building = buildings.find(b => b.id === buildingId)
  const centerX = building.position.x + building.position.width / 2
  const centerY = building.position.y + building.position.height / 2

  let radius = 0
  const maxRadius = Math.max(building.position.width, building.position.height) / 2

  const animate = () => {
    // Draw expanding ripple
    ctx.beginPath()
    ctx.strokeStyle = radius < maxRadius * 0.5 ? '#3b82f6' : '#f59e0b'
    ctx.lineWidth = 3
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    radius += 5

    if (radius < maxRadius) {
      requestAnimationFrame(animate)
    } else {
      // Complete - turn green
      ctx.strokeStyle = '#22c55e'
      ctx.stroke()
    }
  }

  animate()
}
```

#### Type 2: Construct (建造)

**触发时机**: `tool.completed` with tool name containing 'apply' or 'deploy'

**动画效果**:
1. 建筑从地基向上生长
2. Stage 0-30%: 地基出现
3. Stage 30-70%: 框架升起
4. Stage 70-100%: 细节添加
5. 绿色粒子向上飘
6. 持续时长: 1-2秒

**实现**:
```typescript
function playConstructAnimation(buildingId: string, ctx: CanvasRenderingContext2D) {
  const building = buildings.find(b => b.id === buildingId)
  let progress = 0

  const particles: Array<{x: number, y: number, vy: number, alpha: number}> = []

  const animate = () => {
    progress += 0.02

    // Draw building growing from bottom
    const currentHeight = building.position.height * progress
    const y = building.position.y + (building.position.height - currentHeight)

    // Building frame
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(
      building.position.x,
      y,
      building.position.width,
      currentHeight
    )

    // Add particles at top
    if (progress > 0.5) {
      particles.push({
        x: building.position.x + Math.random() * building.position.width,
        y: y,
        vy: -2 - Math.random() * 2,
        alpha: 1
      })
    }

    // Draw and update particles
    particles.forEach((p, i) => {
      p.y += p.vy
      p.alpha -= 0.02

      ctx.fillStyle = `rgba(34, 197, 94, ${p.alpha})`
      ctx.fillRect(p.x, p.y, 4, 4)

      if (p.alpha <= 0) particles.splice(i, 1)
    })

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  animate()
}
```

#### Type 3: Approval (审批)

**触发时机**: `approval.required` event

**动画效果**:
1. Agent从椅子"站起来"（scale up 1.2x）
2. 审批对话框弹出（红色高亮边框）
3. 风险天平动画（risk砝码 vs benefit砝码）
4. **持续直到用户操作**（duration = 0）

**实现**:
```typescript
function playApprovalAnimation(agentId: string, approval: Approval) {
  const agent = agents.find(a => a.id === agentId)
  const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`)

  // Stand up animation
  agentEl.style.transform = 'scale(1.2)'
  agentEl.style.transition = 'transform 0.3s ease-out'

  // Show approval dialog
  const dialog = document.createElement('div')
  dialog.className = 'approval-dialog'
  dialog.innerHTML = `
    <div class="approval-header">
      <span class="approval-icon">⚠️</span>
      <span class="approval-title">需要审批</span>
    </div>
    <div class="approval-content">
      <div class="risk-scale">
        <div class="scale-balance">
          <div class="scale-left">
            <div class="weight-label">风险</div>
            <div class="weight-value">${approval.riskScore}</div>
          </div>
          <div class="scale-right">
            <div class="weight-label">收益</div>
            <div class="weight-value">${approval.benefitScore}</div>
          </div>
        </div>
      </div>
      <div class="approval-description">${approval.description}</div>
    </div>
    <div class="approval-actions">
      <button class="btn-approve" onclick="handleApproval('${agentId}', true)">
        ✓ 批准
      </button>
      <button class="btn-reject" onclick="handleApproval('${agentId}', false)">
        ✗ 拒绝
      </button>
    </div>
  `

  document.body.appendChild(dialog)
}

// Wait for user action
window.handleApproval = (agentId: string, approved: boolean) => {
  // Remove animation
  const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`)
  agentEl.style.transform = 'scale(1.0)'

  document.querySelector('.approval-dialog')?.remove()

  // Send approval decision
  runtimeStore.sendApprovalDecision(agentId, approved)
}
```

### 3.2 Agent Visual States

Agents根据当前任务状态显示不同视觉效果：

```typescript
enum AgentVisualState {
  IDLE = 'idle',           // 空闲，正常大小
  WORKING = 'working',     // 工作中，轻微上下跳动
  THINKING = 'thinking',   // 思考中，显示思考泡泡💭
  EXCITED = 'excited',     // 兴奋，放大1.1x + 粒子效果
  BLOCKED = 'blocked',     // 阻塞，变灰 + 显示⚠️
  SLEEPING = 'sleeping'    // 休息中，显示💤
}

function updateAgentVisualState(agentId: string, state: AgentVisualState) {
  const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`)

  switch (state) {
    case AgentVisualState.WORKING:
      agentEl.classList.add('working-bounce')
      break
    case AgentVisualState.THINKING:
      agentEl.setAttribute('data-bubble', '💭')
      break
    case AgentVisualState.EXCITED:
      agentEl.style.transform = 'scale(1.1)'
      addParticleEffect(agentEl)
      break
    case AgentVisualState.BLOCKED:
      agentEl.style.opacity = '0.5'
      agentEl.setAttribute('data-bubble', '⚠️')
      break
    case AgentVisualState.SLEEPING:
      agentEl.setAttribute('data-bubble', '💤')
      break
  }
}
```

---

## 4. Office Life Behaviors

### 4.1 Idle State Animations

Agents在IDLE状态时，随机触发生活动画（触发频率: 按需，约每30秒一次）：

```typescript
const idleAnimations = [
  { emoji: '💦', text: '擦汗', probability: 0.15 },
  { emoji: '🙆', text: '伸懒腰', probability: 0.10 },
  { emoji: '☕', text: '喝咖啡', probability: 0.10 },
  { emoji: '🍱', text: '吃零食', probability: 0.05 },
  { emoji: '📱', text: '看手机', probability: 0.08 },
  { emoji: '💤', text: '打盹', probability: 0.05 }
]

function triggerIdleAnimation(agent: Agent) {
  if (agent.status !== 'IDLE') return

  // Check if agent is on break
  const timeSinceLastBreak = Date.now() - agent.lastBreakTime
  if (timeSinceLastBreak < agent.personality.preferences.breakFrequency * 60 * 1000) {
    return
  }

  // Random animation
  const rand = Math.random()
  let cumulativeSum = 0
  const animation = idleAnimations.find(a => {
    const prevSum = cumulativeSum
    cumulativeSum += a.probability
    return rand >= prevSum && rand < cumulativeSum
  })

  if (animation) {
    showDialogueBubble(agent.id, animation.emoji, animation.text, 2000)
  }
}
```

### 4.2 Working State Animations

Agents在WORKING状态时，根据role显示不同工作动画：

**Scanner (普查员)**:
- 查看放大镜🔍
- 翻文档📄
- 记笔记📝

**Planner (规划师)**:
- 画思维导图🧠
- 思考💭
- 写代码💻

**Monitor (审核员)**:
- 看文档📋
- 喝茶🍵
- 点头✅

### 4.3 Dialogue System

```typescript
interface DialogueBubble {
  agentId: string
  emoji: string
  text: string
  duration: number // milliseconds
  timestamp: number
}

function showDialogueBubble(
  agentId: string,
  emoji: string,
  text: string,
  duration: number
) {
  const agent = agents.find(a => a.id === agentId)
  const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`)

  // Create bubble element
  const bubble = document.createElement('div')
  bubble.className = 'dialogue-bubble'
  bubble.innerHTML = `
    <div class="bubble-emoji">${emoji}</div>
    <div class="bubble-text">${text}</div>
  `

  // Position above agent
  const rect = agentEl.getBoundingClientRect()
  bubble.style.left = `${rect.left + rect.width / 2}px`
  bubble.style.top = `${rect.top - 60}px`

  document.body.appendChild(bubble)

  // Auto-remove after duration
  setTimeout(() => {
    bubble.style.opacity = '0'
    setTimeout(() => bubble.remove(), 300)
  }, duration)
}

// Generate dialogue based on personality
function generatePersonalityDialogue(
  agent: Agent,
  situation: 'task_complete' | 'task_start' | 'error' | 'break'
): string {
  const { trait } = agent.personality

  const dialogues: Record<string, Record<string, string[]>> = {
    perfectionist: {
      task_complete: [
        '让我再检查一遍... 确保没有遗漏。',
        '这个应该没问题了... 嗯，再看看。'
      ],
      task_start: [
        '开始之前，我需要确认所有前置条件。',
        '让我仔细分析一下需求。'
      ],
      error: [
        '这里有个问题需要修复。',
        '这个边缘情况没有考虑到。'
      ],
      break: [
        '休息一下，回来再仔细检查。',
        '喝口水，继续加油。'
      ]
    },
    artistic: {
      task_complete: [
        '这个方案很优雅，对吧？🎨',
        '代码写得像诗一样~'
      ],
      task_start: [
        '让我想想最优雅的实现方式...',
        '这个功能可以做得更漂亮。'
      ],
      error: [
        '这个重构可以让代码更清晰。',
        '需要优化一下结构。'
      ],
      break: [
        '灵感来了就继续~',
        '休息是为了更好的创作。'
      ]
    },
    strict: {
      task_complete: [
        '合规性检查通过。',
        '所有checklist都已完成。'
      ],
      task_start: [
        '先确认安全要求。',
        '需要评估风险。'
      ],
      error: [
        '这个不符合安全标准。',
        '需要review流程。'
      ],
      break: [
        '喝口茶继续... 🍵',
        '休息一下，保持清醒。'
      ]
    },
    relaxed: {
      task_complete: [
        '搞定了！休息一下~',
        '又完成一个任务，不错！'
      ],
      task_start: [
        '好，开始工作。',
        '这个不难，慢慢来。'
      ],
      error: [
        '有点小问题，修复一下就好。',
        '没关系，总能解决的。'
      ],
      break: [
        '休息时间到！',
        '劳逸结合嘛~'
      ]
    }
  }

  const options = dialogues[trait][situation]
  return options[Math.floor(Math.random() * options.length)]
}
```

---

## 5. Office Interactions

### 5.1 Agent Desk Interaction

点击agent desk显示交互菜单：

```typescript
interface AgentDeskMenu {
  agentId: string
  options: MenuOption[]
}

interface MenuOption {
  label: string
  icon: string
  action: () => void
  cooldown?: number // milliseconds
}

function getAgentDeskMenu(agent: Agent): MenuOption[] {
  return [
    {
      label: '查看当前工作',
      icon: '📋',
      action: () => showCurrentWork(agent)
    },
    {
      label: '打招呼',
      icon: '👋',
      action: () => greetAgent(agent)
    },
    {
      label: '送咖啡 ☕',
      icon: '☕',
      action: () => sendCoffee(agent),
      cooldown: 5 * 60 * 1000 // 5 minutes
    },
    {
      label: '查看工作历史',
      icon: '📊',
      action: () => showWorkHistory(agent)
    },
    {
      label: '查看关系图',
      icon: '🕸️',
      action: () => showRelationshipGraph(agent)
    }
  ]
}
```

### 5.2 Coffee System

送咖啡给agent可以提升工作效率：

```typescript
interface CoffeeBuff {
  agentId: string
  boostAmount: number // 20% speed boost
  expiresAt: number
}

function sendCoffee(agent: Agent): void {
  const now = Date.now()

  // Check cooldown
  if (agent.lastCoffeeTime && now - agent.lastCoffeeTime < 5 * 60 * 1000) {
    showDialogueBubble(agent.id, '☕', '谢谢！但我刚喝过~', 2000)
    return
  }

  // Apply buff
  const buff: CoffeeBuff = {
    agentId: agent.id,
    boostAmount: 0.2, // 20% faster
    expiresAt: now + 5 * 60 * 1000 // 5 minutes
  }

  runtimeStore.applyCoffeeBuff(buff)

  // Show dialogue
  const preferences = agent.personality.preferences.coffeePreference
  const dialogue = {
    black: '黑咖啡，提神醒脑！',
    latte: '拿铁，我的最爱~',
    cappuccino: '卡布奇诺，谢谢！'
  }[preferences]

  showDialogueBubble(agent.id, '☕', dialogue, 2000)

  // Visual effect: coffee icon floats up
  showFloatingIcon(agent.id, '☕')
}

// Apply speed boost
function applyCoffeeBuff(buff: CoffeeBuff): void {
  const agent = agents.find(a => a.id === buff.agentId)
  agent.workSpeedMultiplier = 1 + buff.boostAmount

  // Schedule expiration
  setTimeout(() => {
    agent.workSpeedMultiplier = 1.0
    showDialogueBubble(buff.agentId, '⏰', '咖啡效果结束了', 2000)
  }, buff.expiresAt - Date.now())
}
```

### 5.3 Greeting System

```typescript
function greetAgent(agent: Agent): void {
  // Stop current work temporarily
  const previousState = agent.state
  agent.state = AgentState.INTERACTING

  // Show greeting dialogue based on relationship
  const relationship = agent.relationships[user.id] || 0

  let greeting: string
  if (relationship > 50) {
    greeting = `嘿！很高兴见到你！😄`
  } else if (relationship > 20) {
    greeting = `你好呀~ 👋`
  } else {
    greeting = `哦，你好。`
  }

  showDialogueBubble(agent.id, '👋', greeting, 3000)

  // Improve relationship
  agent.relationships[user.id] = Math.min(100, relationship + 5)

  // Resume work after greeting
  setTimeout(() => {
    agent.state = previousState
  }, 3000)
}
```

### 5.4 Social Interactions

Agents之间可以自发进行社交互动（触发频率: 按需，约每60秒一次，当两个agents都IDLE时）：

```typescript
function triggerSocialInteraction(): void {
  // Find idle agents
  const idleAgents = agents.filter(a => a.status === 'IDLE')
  if (idleAgents.length < 2) return

  // Random pair
  const agent1 = idleAgents[Math.floor(Math.random() * idleAgents.length)]
  const agent2 = idleAgents.filter(a => a.id !== agent1.id)[Math.floor(Math.random() * (idleAgents.length - 1))]

  // Check relationship
  const relationship = agent1.relationships[agent2.id] || 0

  // Generate dialogue based on relationship
  const dialogue = generateSocialDialogue(agent1, agent2, relationship)

  // Show dialogue bubbles
  showDialogueBubble(agent1.id, dialogue.emoji1, dialogue.text1, 3000)
  showDialogueBubble(agent2.id, dialogue.emoji2, dialogue.text2, 3000)

  // Improve relationship
  agent1.relationships[agent2.id] = Math.min(100, relationship + 2)
  agent2.relationships[agent1.id] = Math.min(100, relationship + 2)
}

function generateSocialDialogue(
  agent1: Agent,
  agent2: Agent,
  relationship: number
): { emoji1: string, text1: string, emoji2: string, text2: string } {
  if (relationship > 50) {
    // Good friends
    return {
      emoji1: '😊',
      text1: '嘿，最近怎么样？',
      emoji2: '😄',
      text2: '不错，刚完成一个任务！'
    }
  } else if (relationship > 20) {
    // Acquaintances
    return {
      emoji1: '👋',
      text1: '你好~',
      emoji2: '👋',
      text2: '你好呀！'
    }
  } else {
    // Strangers
    return {
      emoji1: '🤔',
      text1: '那个...你好',
      emoji2: '😊',
      text2: '你好，要一起合作吗？'
    }
  }
}
```

---

## 6. Animation Event Queue

### 6.1 Event Data Structure

```typescript
interface ProjectionEvent {
  id: string
  type: 'scan' | 'construct' | 'approve' | 'poke' | 'social'
  priority: number // 0-10 (0 is highest)
  createdAt: number
  scheduledAt: number
  duration: number // 0 means until user operation
  data: any
  buildingId?: string
  agentId?: string
}
```

### 6.2 Priority Levels

```typescript
enum AnimationPriority {
  APPROVAL = 1,      // Highest - approval events
  CONSTRUCT = 2,     // Building construction
  SCAN = 3,          // Scanning operations
  USER_INTERACTION = 4, // Poke, coffee, greetings
  SOCIAL = 5,        // Agent social interactions
  IDLE = 6           // Lowest - idle animations
}
```

### 6.3 Queue Implementation

```typescript
class AnimationQueue {
  private queue: ProjectionEvent[] = []
  private readonly maxSize = 50

  enqueue(event: ProjectionEvent): boolean {
    // Check capacity
    if (this.queue.length >= this.maxSize) {
      const dropped = this.dropLowestPriorityEvent()
      if (dropped.type === 'approve') {
        console.error('Critical approval event dropped!')
        return false
      }
      console.warn('Queue full, dropped:', dropped.id)
    }

    this.queue.push(event)
    this.sortByPriority()
    return true
  }

  dequeue(): ProjectionEvent | null {
    return this.queue.shift() || null
  }

  private sortByPriority(): void {
    this.queue.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by creation time (FIFO within same priority)
      return a.createdAt - b.createdAt
    })
  }

  private dropLowestPriorityEvent(): ProjectionEvent {
    // Find lowest priority, oldest event
    let lowestIdx = 0
    for (let i = 1; i < this.queue.length; i++) {
      const current = this.queue[i]
      const lowest = this.queue[lowestIdx]

      if (current.priority > lowest.priority) {
        lowestIdx = i
      } else if (current.priority === lowest.priority) {
        if (current.createdAt < lowest.createdAt) {
          lowestIdx = i
        }
      }
    }

    return this.queue.splice(lowestIdx, 1)[0]
  }
}
```

### 6.4 Queue Processing

```typescript
function processAnimationQueue(): void {
  const queue = runtimeStore.projectionEvents
  if (queue.length === 0) return

  const now = Date.now()

  // Process up to 3 events per frame (avoid blocking)
  const eventsToProcess = queue.slice(0, 3)

  for (const event of eventsToProcess) {
    if (now >= event.scheduledAt) {
      playAnimation(event)
      dequeueEvent(event.id)
    }
  }

  requestAnimationFrame(processAnimationQueue)
}

function playAnimation(event: ProjectionEvent): void {
  try {
    switch (event.type) {
      case 'scan':
        playScanAnimation(event.buildingId, canvasContext)
        break
      case 'construct':
        playConstructAnimation(event.buildingId, canvasContext)
        break
      case 'approve':
        playApprovalAnimation(event.agentId, event.data)
        break
      case 'poke':
        playPokeAnimation(event.agentId)
        break
      case 'social':
        playSocialAnimation(event.agentId, event.data)
        break
    }
  } catch (error) {
    console.error('Animation failed:', event.id, error)
    handleAnimationFailure(event)
  }
}

function handleAnimationFailure(event: ProjectionEvent): void {
  // Fallback: show static icon
  if (event.buildingId) {
    showStaticIcon(event.buildingId, getIconForType(event.type))
  }

  // Remove from queue to prevent blocking
  dequeueEvent(event.id)
}
```

---

## 7. Data Flow

### 7.1 Event Flow Architecture

```
OpenCode Event
  ↓
runtimeStore.ingestRawEvent()
  ↓
├─→ officeProjector.reduceOfficeProjection()
│   ↓
│   Update agents state (status, task, dialogue)
│   ↓
│   runtimeStore.agents[]
│
└─→ cityProjector.projectCityEvents()
    ↓
    Generate ProjectionEvent[]
    ↓
    Enqueue to runtimeStore.projectionEvents[]
    ↓
    Animation Queue Processing
    ↓
    Play animations on CityMap
    ↓
    CityHudMap renders visual effects
```

### 7.2 Event Mapping

```typescript
// OpenCode event → Agent state update
const officeEventMappings = {
  'agent.spawned': (event, state) => {
    state.agents[event.agentId] = {
      id: event.agentId,
      name: event.agentName,
      role: event.role,
      status: 'IDLE',
      personality: generatePersonality(event.role)
    }
  },

  'tool.started': (event, state) => {
    const agent = state.agents[event.agentId]
    agent.status = 'WORKING'
    agent.currentTask = event.tool
    agent.visualState = AgentVisualState.WORKING
  },

  'tool.completed': (event, state) => {
    const agent = state.agents[event.agentId]
    agent.status = 'IDLE'
    agent.currentTask = null
    agent.visualState = AgentVisualState.IDLE

    // Generate personality dialogue
    const dialogue = generatePersonalityDialogue(agent, 'task_complete')
    showDialogueBubble(agent.id, '✓', dialogue, 3000)
  },

  'approval.required': (event, state) => {
    const agent = state.agents[event.agentId]
    agent.status = 'WAITING_APPROVAL'
    agent.visualState = AgentVisualState.BLOCKED

    // Generate approval animation event
    const approvalEvent: ProjectionEvent = {
      id: `approve-${event.approvalId}`,
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 0, // Wait for user action
      data: event.approval,
      agentId: event.agentId
    }

    state.projectionEvents.push(approvalEvent)
  }
}

// OpenCode event → City animation
const cityEventMappings = {
  'tool.started': (event) => {
    if (event.tool.includes('scan') || event.tool.includes('validate')) {
      return {
        type: 'scan',
        priority: AnimationPriority.SCAN,
        buildingId: event.buildingId,
        duration: 2000
      }
    }
  },

  'tool.completed': (event) => {
    if (event.tool.includes('apply') || event.tool.includes('deploy')) {
      return {
        type: 'construct',
        priority: AnimationPriority.CONSTRUCT,
        buildingId: event.buildingId,
        duration: 1500
      }
    }
  }
}
```

---

## 8. Error Handling

### 8.1 Connection Failure Handling

```typescript
interface ConnectionHealth {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  lastHeartbeat: number
  retryCount: number
}

// Connection state management
function handleConnectionDisconnection(): void {
  // Gray out all agents
  Object.values(runtimeStore.agents).forEach(agent => {
    agent.visualState = AgentVisualState.BLOCKED
    agent.status = 'OFFLINE'
  })

  // Pause animation queue (don't clear)
  runtimeStore.queuePaused = true

  // Show reconnection indicator
  showReconnectionIndicator()
}

function handleConnectionReconnected(): void {
  // Fast replay missed events (2x speed)
  const missedEvents = getMissedEvents()
  replayEvents(missedEvents, 2.0)

  // Resume queue
  runtimeStore.queuePaused = false

  // Restore agent states
  Object.values(runtimeStore.agents).forEach(agent => {
    if (agent.status !== 'OFFLINE') return
    agent.status = 'IDLE'
    agent.visualState = AgentVisualState.IDLE
  })

  hideReconnectionIndicator()
}

// Reconnection strategy
function reconnectWithBackoff(): void {
  const delays = [1000, 2000, 4000, 8000, 15000] // Max 15s
  let attempt = 0

  const tryReconnect = () => {
    if (attempt >= delays.length) {
      showErrorMessage('连接已断开，请刷新页面')
      return
    }

    runtimeStore.connectionStatus = 'reconnecting'

    setTimeout(() => {
      const success = attemptReconnection()
      if (success) {
        handleConnectionReconnected()
      } else {
        attempt++
        tryReconnect()
      }
    }, delays[attempt])
  }

  tryReconnect()
}
```

### 8.2 Animation Crash Recovery

```typescript
function playAnimation(event: ProjectionEvent): void {
  try {
    switch (event.type) {
      case 'scan':
        playScanAnimation(event.buildingId, canvasContext)
        break
      // ... other cases
    }
  } catch (error) {
    console.error('Animation failed:', event.id, error)

    // Fallback to static icon
    showStaticIcon(event.buildingId, getIconForType(event.type))

    // Remove from queue to prevent blocking
    dequeueEvent(event.id)
  }
}

function showStaticIcon(buildingId: string, icon: string): void {
  const building = buildings.find(b => b.id === buildingId)
  const ctx = canvas.getContext('2d')

  const centerX = building.position.x + building.position.width / 2
  const centerY = building.position.y + building.position.height / 2

  ctx.font = '32px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, centerX, centerY)
}
```

### 8.3 Event Queue Overflow

```typescript
function enqueueEvent(event: ProjectionEvent): boolean {
  const MAX_QUEUE_SIZE = 50

  if (runtimeStore.projectionEvents.length >= MAX_QUEUE_SIZE) {
    // Priority-based drop
    const dropped = dropLowestPriorityEvent()

    // Never drop approval events
    if (dropped.type === 'approve') {
      console.error('CRITICAL: Approval event dropped!')
      return false
    }

    console.warn('Queue full, dropped:', dropped.id)
  }

  runtimeStore.projectionEvents.push(event)
  return true
}
```

---

## 9. Performance Optimization

### 9.1 Animation Performance

```typescript
// Use requestAnimationFrame for smooth animations
let animationFrameId: number

function animate(): void {
  const now = Date.now()

  // Process max 3 events per frame
  const eventsToProcess = runtimeStore.projectionEvents.slice(0, 3)

  for (const event of eventsToProcess) {
    if (now >= event.scheduledAt) {
      playAnimation(event)
      dequeueEvent(event.id)
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

// Use CSS transform for GPU acceleration
.animated-element {
  transform: translate3d(x, y, 0);
  will-change: transform;
}
```

### 9.2 Debounce Throttling

```typescript
// Debounce agent state updates
const debouncedUpdateAgents = debounce((agents) => {
  runtimeStore.setAgents(agents)
}, 100)

// Batch office events (every 200ms)
const batchedOfficeEvents = new Map<string, OfficeEvent[]>()

function batchOfficeEvent(agentId: string, event: OfficeEvent): void {
  if (!batchedOfficeEvents.has(agentId)) {
    batchedOfficeEvents.set(agentId, [])
  }
  batchedOfficeEvents.get(agentId).push(event)
}

setInterval(() => {
  for (const [agentId, events] of batchedOfficeEvents) {
    processOfficeEventsBatch(agentId, events)
  }
  batchedOfficeEvents.clear()
}, 200)
```

### 9.3 Memory Management

```typescript
// Clean up finished animation DOM elements
setInterval(() => {
  const now = Date.now()
  document.querySelectorAll('.animation-overlay').forEach(el => {
    const endTime = parseInt(el.dataset.endTime || '0')
    if (now > endTime) {
      el.remove()
    }
  })
}, 5000)

// Limit agent state history
const MAX_STATE_HISTORY = 100

function addStateToHistory(agent: Agent, state: AgentState): void {
  agent.stateHistory.push(state)
  if (agent.stateHistory.length > MAX_STATE_HISTORY) {
    agent.stateHistory = agent.stateHistory.slice(-MAX_STATE_HISTORY)
  }
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// Agent personality system
describe('AgentPersonality', () => {
  test('should generate dialogue based on trait', () => {
    const agent = createAgent('scanner-1', { trait: 'perfectionist' })
    const dialogue = generatePersonalityDialogue(agent, 'task_complete')
    expect(dialogue).toContain('检查')
  })

  test('should update relationship on collaboration', () => {
    const agent1 = createAgent('agent-1')
    const agent2 = createAgent('agent-2')
    updateRelationship(agent1, agent2, +10)
    expect(agent1.relationships['agent-2']).toBe(10)
  })
})

// Animation queue priority
describe('AnimationQueue', () => {
  test('should process approval events first', () => {
    const queue = new AnimationQueue()
    queue.enqueue({ type: 'scan', priority: 5 })
    queue.enqueue({ type: 'approve', priority: 1 })

    const next = queue.dequeue()
    expect(next.type).toBe('approve')
  })

  test('should drop lowest priority on overflow', () => {
    const queue = new AnimationQueue(50)
    for (let i = 0; i < 51; i++) {
      queue.enqueue({ type: 'social', priority: 10 })
    }

    expect(queue.size()).toBe(50)
  })
})
```

### 10.2 Integration Tests

```typescript
describe('Runtime Event Integration', () => {
  test('agent.spawned event should create new agent', async () => {
    const event = createMockEvent('agent.spawned', {
      agentId: 'test-agent',
      role: 'SCANNER'
    })

    await runtimeStore.ingestRawEvent(event)

    expect(runtimeStore.agents['test-agent']).toBeDefined()
    expect(runtimeStore.agents['test-agent'].role).toBe('SCANNER')
  })

  test('tool.started should update agent to WORKING', async () => {
    const agent = createAgent('test-agent')
    runtimeStore.setAgents({ 'test-agent': agent })

    const event = createMockEvent('tool.started', {
      agentId: 'test-agent',
      tool: 'terraform.validate'
    })

    await runtimeStore.ingestRawEvent(event)

    expect(runtimeStore.agents['test-agent'].status).toBe('WORKING')
    expect(runtimeStore.agents['test-agent'].currentTask).toBe('terraform.validate')
  })
})

describe('City Projection', () => {
  test('tool.completed should generate construct animation', async () => {
    const event = createMockEvent('tool.completed', {
      tool: 'terraform.apply',
      buildingId: 'data-center'
    })

    const animations = cityProjector.projectCityEvents(event)

    expect(animations).toHaveLength(1)
    expect(animations[0].type).toBe('construct')
    expect(animations[0].buildingId).toBe('data-center')
  })
})
```

### 10.3 Animation Timing Tests

```typescript
describe('Animation Timing', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('scan animation should last 2-3 seconds', () => {
    const animation = playScanAnimation(building)

    jest.advanceTimersByTime(2000)
    expect(animation.isAnimating()).toBe(true)

    jest.advanceTimersByTime(1000)
    expect(animation.isAnimating()).toBe(false)
  })

  test('approval animation should wait for user action', () => {
    const animation = playApprovalAnimation(agent)

    jest.advanceTimersByTime(10000)
    expect(animation.isWaitingForUser()).toBe(true)

    animation.onUserDecision('approved')
    expect(animation.isWaitingForUser()).toBe(false)
  })
})
```

### 10.4 Manual Testing Checklist

```markdown
## 场景测试清单

### Agent Personality
- [ ] Scanner agent完成task后显示"再检查一遍"对话
- [ ] Planner agent完成task后显示"优雅的方案"对话
- [ ] Monitor agent完成task后显示"合规性检查通过"对话
- [ ] Agent idle时随机触发擦汗、伸懒腰等动画
- [ ] Agent relationship > 50时显示友好对话

### Office Interactions
- [ ] 点击agent desk显示菜单
- [ ] 点击"打招呼"显示对话气泡
- [ ] 点击"送咖啡"显示咖啡☕️动画,+20%效率提示
- [ ] 点击"查看工作历史"显示历史记录

### City Animations
- [ ] Scan动画: 波纹从中心向外扩散
- [ ] Construct动画: 建筑从地基向上生长
- [ ] Approval动画: Agent站立+对话框弹出+风险天平
- [ ] 点击"Approve"后动画消失,building状态更新

### Error Handling
- [ ] 断开SSE连接,agents变灰
- [ ] 重连后,missed events快速播放
- [ ] 队列满时,丢弃lowest priority事件
```

---

## 11. Implementation Considerations

### 11.1 File Structure

```
src/
├── runtime/
│   ├── opencode/
│   │   ├── client.ts              # SSE/WebSocket client
│   │   ├── adapter.ts             # Event adapter
│   │   └── types.ts               # Event types
│   └── projectors/
│       ├── officeProjector.ts     # Agent state updates
│       └── cityProjector.ts       # Animation event generation
├── store/
│   └── runtimeStore.ts            # Runtime state management
├── components/
│   ├── map/
│   │   ├── CityMapComplete.tsx    # Main map component
│   │   ├── MapCanvas.tsx          # Canvas rendering
│   │   └── AgentRenderer.tsx      # Agent overlays
│   └── city/
│       └── AgentOfficePanel.tsx   # Office panel
├── utils/
│   ├── mapAnimations.ts           # Animation functions
│   ├── mapRendering.ts            # Map rendering
│   └── agentPersonality.ts        # Personality logic
└── types/
    ├── agents.ts                  # Agent types
    └── map.ts                     # Map types
```

### 11.2 Dependencies

- **Runtime层**: SSE/WebSocket client库
- **动画**: Canvas API + CSS animations
- **状态管理**: Zustand (runtimeStore)
- **类型安全**: TypeScript

### 11.3 Performance Budget

- **动画帧率**: 60 FPS
- **队列处理**: Max 3 events/frame
- **内存**: Agent history < 100 records
- **DOM清理**: 每5秒清理finished animations
- **事件批处理**: 200ms batches for office events

---

## 12. Future Enhancements

### 12.1 Short-term Improvements

1. **More personality traits**: Add 'adventurous', 'cautious', 'competitive'
2. **Advanced social**: Group conversations, team-building events
3. **Office customization**: Decorate desks, personalize workspaces
4. **Achievement system**: Badges for agents based on performance

### 12.2 Long-term Vision

1. **Agent learning**: Agents adapt based on user feedback
2. **Procedural stories**: Agents develop narratives over time
3. **Multi-user collaboration**: Multiple users interact with same agents
4. **Voice interactions**: Talk to agents using speech

---

## 13. Open Questions

1. **Persistence**: Should agent personalities and relationships persist across sessions?
   - **Recommendation**: Persist relationships, randomize quirks on each session

2. **Scalability**: How many agents can the system support before animations become chaotic?
   - **Recommendation**: Limit to 8-12 active agents, use queue priority to manage load

3. **User custom agents**: Can users create their own agents with custom personalities?
   - **Recommendation**: Phase 2 feature, start with predefined personalities

---

## 14. Success Metrics

1. **Engagement**: Users interact with agents (coffee, greetings) at least 3x/session
2. **Visual clarity**: Animation queue never drops approval events
3. **Performance**: 60 FPS maintained with 10+ agents working simultaneously
4. **User satisfaction**: Positive feedback on agent personalities and animations

---

**Document Version:** 1.0
**Last Updated:** 2026-04-07
**Status:** Ready for Implementation Planning
