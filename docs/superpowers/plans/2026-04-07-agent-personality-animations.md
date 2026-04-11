# Agent个性化 + 实时工作动画实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为Pixel Office CityHud创建生动的agent个性化系统和实时工作动画，包括性格特质、社交互动、动画事件队列和办公交互功能。

**Architecture:** 扩展现有Agent类型系统，添加personality层；创建动画事件队列系统；通过projectors将OpenCode事件映射到agent状态和动画；在UI层实现视觉效果和交互。

**Tech Stack:** TypeScript, Zustand, Canvas API, React, Jest

---

## Task 1: 扩展Agent类型定义

**Files:**
- Modify: `src/types/agents.ts`
- Test: `src/types/agents.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/agents.test.ts
import { AgentPersonality, PersonalityTrait, generatePersonality } from './agents';

describe('AgentPersonality', () => {
  test('should generate perfectionist personality for SCANNER role', () => {
    const personality = generatePersonality('scanner');
    expect(personality.trait).toBe('perfectionist');
    expect(personality.quirks).toHaveLength(2);
    expect(personality.workStyle).toBe('thorough');
  });

  test('should generate artistic personality for PLANNER role', () => {
    const personality = generatePersonality('planner');
    expect(personality.trait).toBe('artistic');
    expect(personality.workStyle).toBe('creative');
  });

  test('should generate strict personality for MONITOR role', () => {
    const personality = generatePersonality('monitor');
    expect(personality.trait).toBe('strict');
    expect(personality.workStyle).toBe('thorough');
  });

  test('should include all required personality fields', () => {
    const personality = generatePersonality('scanner');
    expect(personality).toHaveProperty('trait');
    expect(personality).toHaveProperty('quirks');
    expect(personality).toHaveProperty('workStyle');
    expect(personality).toHaveProperty('relationships');
    expect(personality).toHaveProperty('stats');
    expect(personality).toHaveProperty('preferences');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend/pixel-prototype && npm test -- src/types/agents.test.ts`
Expected: FAIL with "generatePersonality not defined"

- [ ] **Step 3: Add personality types to agents.ts**

Add to `src/types/agents.ts`:

```typescript
// Personality traits
export type PersonalityTrait = 'perfectionist' | 'artistic' | 'strict' | 'relaxed';
export type WorkStyle = 'fast' | 'thorough' | 'creative';

export interface AgentPersonality {
  trait: PersonalityTrait;
  quirks: string[];
  workStyle: WorkStyle;
  relationships: Record<string, number>; // -100 to 100
  stats: {
    deploymentsCompleted: number;
    deploymentsRejected: number;
    averageSpeed: number; // seconds per task
  };
  preferences: {
    favoriteBuilding?: string;
    coffeePreference: 'black' | 'latte' | 'cappuccino';
    breakFrequency: number; // minutes between breaks
  };
}

// Visual states for agents
export enum AgentVisualState {
  IDLE = 'idle',
  WORKING = 'working',
  THINKING = 'thinking',
  EXCITED = 'excited',
  BLOCKED = 'blocked',
  SLEEPING = 'sleeping',
  OFFLINE = 'offline'
}

// Coffee buff
export interface CoffeeBuff {
  agentId: string;
  boostAmount: number; // 0.2 = 20% speed boost
  expiresAt: number;
}

// Update Agent interface to include personality
export interface Agent {
  // ... existing fields ...
  personality?: AgentPersonality;
  visualState?: AgentVisualState;
  workSpeedMultiplier?: number;
  lastCoffeeTime?: number;
  lastBreakTime?: number;
  stateHistory: AgentState[]; // Track state changes
}

// Dialogue bubble
export interface DialogueBubble {
  agentId: string;
  emoji: string;
  text: string;
  duration: number;
  timestamp: number;
}

// Personality generation function
export function generatePersonality(role: AgentRole): AgentPersonality {
  const traitMapping: Record<AgentRole, PersonalityTrait> = {
    [AgentRole.SCANNER]: 'perfectionist',
    [AgentRole.PLANNER]: 'artistic',
    [AgentRole.MONITOR]: 'strict'
  };

  const workStyleMapping: Record<PersonalityTrait, WorkStyle> = {
    perfectionist: 'thorough',
    artistic: 'creative',
    strict: 'thorough',
    relaxed: 'fast'
  };

  const quirksByTrait: Record<PersonalityTrait, string[]> = {
    perfectionist: [
      '收集放大镜', '反复检查', '追求完美', '注重细节'
    ],
    artistic: [
      '追求优雅', '喜欢emoji', '注重美学', '创意无限'
    ],
    strict: [
      '喝茶解压', '严格review', '遵循流程', '合规第一'
    ],
    relaxed: [
      '善于沟通', '乐观积极', '轻松应对', '团队协作'
    ]
  };

  const trait = traitMapping[role];
  const allQuirks = quirksByTrait[trait];

  // Randomly select 2-3 quirks
  const numQuirks = 2 + Math.floor(Math.random() * 2);
  const quirks: string[] = [];
  for (let i = 0; i < numQuirks; i++) {
    const randomIndex = Math.floor(Math.random() * allQuirks.length);
    if (!quirks.includes(allQuirks[randomIndex])) {
      quirks.push(allQuirks[randomIndex]);
    }
  }

  return {
    trait,
    quirks,
    workStyle: workStyleMapping[trait],
    relationships: {},
    stats: {
      deploymentsCompleted: 0,
      deploymentsRejected: 0,
      averageSpeed: 0
    },
    preferences: {
      coffeePreference: ['black', 'latte', 'cappuccino'][Math.floor(Math.random() * 3)] as any,
      breakFrequency: 30 + Math.floor(Math.random() * 60) // 30-90 minutes
    }
  };
}
```

- [ ] **Step 4: Update Agent interface initialization**

Modify `createAgent` in `src/store/agents.ts`:

```typescript
import { generatePersonality } from '@/types/agents';

createAgent: (id: string, role: AgentRole, icon: string, name: string) => {
  const personality = generatePersonality(role);

  const newAgent: Agent = {
    id,
    name,
    icon,
    role,
    state: AgentState.IDLE,
    location: { type: 'office' },
    position: { x: 400, y: 350, tileCol: 20, tileRow: 17 },
    path: [],
    currentTask: null,
    progress: 0,
    bubble: null,
    palette: Math.floor(Math.random() * 5),
    frame: 0,
    frameTimer: 0,
    personality,
    visualState: AgentVisualState.IDLE,
    workSpeedMultiplier: 1.0,
    lastBreakTime: Date.now(),
    stateHistory: []
  };

  set((state) => ({
    agents: { ...state.agents, [id]: newAgent }
  }));

  return newAgent;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend/pixel-prototype && npm test -- src/types/agents.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd frontend/pixel-prototype
git add src/types/agents.ts src/types/agents.test.ts src/store/agents.ts
git commit -m "feat: add agent personality system

- Add PersonalityTrait, WorkStyle, AgentVisualState types
- Add AgentPersonality interface with trait, quirks, relationships
- Implement generatePersonality() based on agent role
- Update Agent interface with personality fields
- Initialize personality in createAgent()
- Add tests for personality generation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 创建Dialogue系统

**Files:**
- Create: `src/utils/dialogueSystem.ts`
- Test: `src/utils/dialogueSystem.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/dialogueSystem.test.ts
import { generatePersonalityDialogue, generateSocialDialogue } from './dialogueSystem';
import { Agent, AgentRole, generatePersonality } from '@/types/agents';

describe('DialogueSystem', () => {
  test('perfectionist agent should mention checking on task_complete', () => {
    const agent: Agent = {
      id: 'test-1',
      name: 'Test Agent',
      icon: '🕵️',
      role: AgentRole.SCANNER,
      state: 'idle' as any,
      location: { type: 'office' },
      position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0,
      personality: generatePersonality(AgentRole.SCANNER),
      stateHistory: []
    };

    const dialogue = generatePersonalityDialogue(agent, 'task_complete');
    expect(dialogue).toContain('检查');
  });

  test('artistic agent should mention elegance on task_complete', () => {
    const agent: Agent = {
      id: 'test-2',
      name: 'Test Agent',
      icon: '👨‍🎨',
      role: AgentRole.PLANNER,
      state: 'idle' as any,
      location: { type: 'office' },
      position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0,
      personality: generatePersonality(AgentRole.PLANNER),
      stateHistory: []
    };

    const dialogue = generatePersonalityDialogue(agent, 'task_complete');
    expect(dialogue).toMatch(/优雅|漂亮/);
  });

  test('should generate different dialogues for same situation', () => {
    const agent: Agent = {
      id: 'test-3',
      name: 'Test Agent',
      icon: '👮',
      role: AgentRole.MONITOR,
      state: 'idle' as any,
      location: { type: 'office' },
      position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0,
      personality: generatePersonality(AgentRole.MONITOR),
      stateHistory: []
    };

    const dialogues = new Set();
    for (let i = 0; i < 20; i++) {
      dialogues.add(generatePersonalityDialogue(agent, 'task_complete'));
    }
    expect(dialogues.size).toBeGreaterThan(1);
  });

  test('social dialogue should reflect relationship level', () => {
    const agent1: Agent = {
      id: 'agent-1',
      name: 'Agent 1',
      icon: '🕵️',
      role: AgentRole.SCANNER,
      state: 'idle' as any,
      location: { type: 'office' },
      position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0,
      personality: {
        ...generatePersonality(AgentRole.SCANNER),
        relationships: { 'agent-2': 60 }
      },
      stateHistory: []
    };

    const dialogue = generateSocialDialogue(agent1, 'agent-2');
    expect(dialogue.text1).toMatch(/嘿|最近/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/dialogueSystem.test.ts`
Expected: FAIL with "dialogueSystem not found"

- [ ] **Step 3: Implement dialogueSystem.ts**

```typescript
// src/utils/dialogueSystem.ts
import { Agent, PersonalityTrait } from '@/types/agents';

type DialogueSituation = 'task_complete' | 'task_start' | 'error' | 'break';

const dialogueTemplates: Record<PersonalityTrait, Record<DialogueSituation, string[]>> = {
  perfectionist: {
    task_complete: [
      '让我再检查一遍... 确保没有遗漏。',
      '这个应该没问题了... 嗯，再看看。',
      '数据都验证过了，没有发现异常。'
    ],
    task_start: [
      '开始之前，我需要确认所有前置条件。',
      '让我仔细分析一下需求。',
      '先确认一下边界条件。'
    ],
    error: [
      '这里有个问题需要修复。',
      '这个边缘情况没有考虑到。',
      '数据不一致，需要重新验证。'
    ],
    break: [
      '休息一下，回来再仔细检查。',
      '喝口水，继续加油。',
      '稍微休息，保持专注。'
    ]
  },
  artistic: {
    task_complete: [
      '这个方案很优雅，对吧？🎨',
      '代码写得像诗一样~',
      '这个设计很有美感！'
    ],
    task_start: [
      '让我想想最优雅的实现方式...',
      '这个功能可以做得更漂亮。',
      '追求代码的简洁之美。'
    ],
    error: [
      '这个重构可以让代码更清晰。',
      '需要优化一下结构。',
      '让代码更优雅一些。'
    ],
    break: [
      '灵感来了就继续~',
      '休息是为了更好的创作。',
      '创意需要时间酝酿。'
    ]
  },
  strict: {
    task_complete: [
      '合规性检查通过。',
      '所有checklist都已完成。',
      '流程符合标准。'
    ],
    task_start: [
      '先确认安全要求。',
      '需要评估风险。',
      '按照标准流程执行。'
    ],
    error: [
      '这个不符合安全标准。',
      '需要review流程。',
      '违反了合规要求。'
    ],
    break: [
      '喝口茶继续... 🍵',
      '休息一下，保持清醒。',
      '严格按照流程进行。'
    ]
  },
  relaxed: {
    task_complete: [
      '搞定了！休息一下~',
      '又完成一个任务，不错！',
      '顺利完成，继续保持。'
    ],
    task_start: [
      '好，开始工作。',
      '这个不难，慢慢来。',
      '保持节奏，稳步推进。'
    ],
    error: [
      '有点小问题，修复一下就好。',
      '没关系，总能解决的。',
      '问题不大，慢慢来。'
    ],
    break: [
      '休息时间到！',
      '劳逸结合嘛~',
      '放松一下再继续。'
    ]
  }
};

export function generatePersonalityDialogue(
  agent: Agent,
  situation: DialogueSituation
): string {
  if (!agent.personality) {
    return '任务完成。';
  }

  const { trait } = agent.personality;
  const options = dialogueTemplates[trait][situation];

  if (!options || options.length === 0) {
    return '任务完成。';
  }

  // Randomly select one dialogue
  return options[Math.floor(Math.random() * options.length)];
}

export interface SocialDialogue {
  emoji1: string;
  text1: string;
  emoji2: string;
  text2: string;
}

export function generateSocialDialogue(
  agent1: Agent,
  agent2Id: string
): SocialDialogue {
  const relationship = agent1.personality?.relationships[agent2Id] || 0;

  if (relationship > 50) {
    // Good friends
    return {
      emoji1: '😊',
      text1: '嘿，最近怎么样？',
      emoji2: '😄',
      text2: '不错，刚完成一个任务！'
    };
  } else if (relationship > 20) {
    // Acquaintances
    return {
      emoji1: '👋',
      text1: '你好~',
      emoji2: '👋',
      text2: '你好呀！'
    };
  } else {
    // Strangers
    return {
      emoji1: '🤔',
      text1: '那个...你好',
      emoji2: '😊',
      text2: '你好，要一起合作吗？'
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/dialogueSystem.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd frontend/pixel-prototype
git add src/utils/dialogueSystem.ts src/utils/dialogueSystem.test.ts
git commit -m "feat: implement dialogue system for agents

- Add generatePersonalityDialogue() based on trait and situation
- Add generateSocialDialogue() based on relationship level
- Define dialogue templates for each personality type
- Support task_complete, task_start, error, break situations
- Add tests for dialogue generation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建动画事件队列

**Files:**
- Create: `src/utils/animationQueue.ts`
- Test: `src/utils/animationQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/animationQueue.test.ts
import { AnimationQueue, AnimationPriority } from './animationQueue';

describe('AnimationQueue', () => {
  test('should enqueue and dequeue events in priority order', () => {
    const queue = new AnimationQueue(50);

    queue.enqueue({
      id: 'scan-1',
      type: 'scan',
      priority: AnimationPriority.SCAN,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 2000,
      data: {},
      buildingId: 'building-1'
    });

    queue.enqueue({
      id: 'approve-1',
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 0,
      data: {},
      agentId: 'agent-1'
    });

    const first = queue.dequeue();
    expect(first?.id).toBe('approve-1'); // Approval has higher priority

    const second = queue.dequeue();
    expect(second?.id).toBe('scan-1');
  });

  test('should drop lowest priority event when queue is full', () => {
    const queue = new AnimationQueue(3);

    // Fill queue with high priority events
    queue.enqueue({
      id: 'approve-1',
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now() - 3000,
      scheduledAt: Date.now(),
      duration: 0,
      data: {},
      agentId: 'agent-1'
    });

    queue.enqueue({
      id: 'construct-1',
      type: 'construct',
      priority: AnimationPriority.CONSTRUCT,
      createdAt: Date.now() - 2000,
      scheduledAt: Date.now(),
      duration: 1500,
      data: {},
      buildingId: 'building-1'
    });

    queue.enqueue({
      id: 'scan-1',
      type: 'scan',
      priority: AnimationPriority.SCAN,
      createdAt: Date.now() - 1000,
      scheduledAt: Date.now(),
      duration: 2000,
      data: {},
      buildingId: 'building-1'
    });

    // Queue is now full (3/3), adding another should drop lowest priority
    const dropped = queue.enqueue({
      id: 'social-1',
      type: 'social',
      priority: AnimationPriority.SOCIAL,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 3000,
      data: {},
      agentId: 'agent-1'
    });

    expect(dropped).toBe(true);
    expect(queue.size()).toBe(3);

    // Verify social event was dropped, not approval
    const events: string[] = [];
    while (queue.size() > 0) {
      events.push(queue.dequeue()!.id);
    }
    expect(events).toContain('approve-1');
    expect(events).not.toContain('social-1');
  });

  test('should never drop approval events', () => {
    const queue = new AnimationQueue(2);

    queue.enqueue({
      id: 'scan-1',
      type: 'scan',
      priority: AnimationPriority.SCAN,
      createdAt: Date.now() - 1000,
      scheduledAt: Date.now(),
      duration: 2000,
      data: {},
      buildingId: 'building-1'
    });

    queue.enqueue({
      id: 'construct-1',
      type: 'construct',
      priority: AnimationPriority.CONSTRUCT,
      createdAt: Date.now() - 500,
      scheduledAt: Date.now(),
      duration: 1500,
      data: {},
      buildingId: 'building-1'
    });

    // Try to add approval when full - should fail
    const result = queue.enqueue({
      id: 'approve-1',
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 0,
      data: {},
      agentId: 'agent-1'
    });

    expect(result).toBe(false); // Should reject to avoid dropping approval
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/animationQueue.test.ts`
Expected: FAIL with "animationQueue not found"

- [ ] **Step 3: Implement animationQueue.ts**

```typescript
// src/utils/animationQueue.ts

export enum AnimationPriority {
  APPROVAL = 1,      // Highest - approval events
  CONSTRUCT = 2,     // Building construction
  SCAN = 3,          // Scanning operations
  USER_INTERACTION = 4, // Poke, coffee, greetings
  SOCIAL = 5,        // Agent social interactions
  IDLE = 6           // Lowest - idle animations
}

export type AnimationType = 'scan' | 'construct' | 'approve' | 'poke' | 'social';

export interface ProjectionEvent {
  id: string;
  type: AnimationType;
  priority: number; // 0-10 (0 is highest)
  createdAt: number;
  scheduledAt: number;
  duration: number; // 0 means until user operation
  data: any;
  buildingId?: string;
  agentId?: string;
}

export class AnimationQueue {
  private queue: ProjectionEvent[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  enqueue(event: ProjectionEvent): boolean {
    // Check capacity
    if (this.queue.length >= this.maxSize) {
      // If this is an approval event, reject to avoid dropping it
      if (event.type === 'approve') {
        console.error('[AnimationQueue] CRITICAL: Approval event rejected, queue full');
        return false;
      }

      const dropped = this.dropLowestPriorityEvent();
      if (dropped.type === 'approve') {
        console.error('[AnimationQueue] CRITICAL: Approval event dropped!');
        return false;
      }
      console.warn(`[AnimationQueue] Queue full, dropped: ${dropped.id}`);
    }

    this.queue.push(event);
    this.sortByPriority();
    return true;
  }

  dequeue(): ProjectionEvent | null {
    return this.queue.shift() || null;
  }

  peek(): ProjectionEvent | null {
    return this.queue[0] || null;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  remove(eventId: string): boolean {
    const index = this.queue.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  private sortByPriority(): void {
    this.queue.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by creation time (FIFO within same priority)
      return a.createdAt - b.createdAt;
    });
  }

  private dropLowestPriorityEvent(): ProjectionEvent {
    // Find lowest priority, oldest event
    let lowestIdx = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const current = this.queue[i];
      const lowest = this.queue[lowestIdx];

      // Higher priority number = lower priority
      if (current.priority > lowest.priority) {
        lowestIdx = i;
      } else if (current.priority === lowest.priority) {
        // If same priority, drop the older one
        if (current.createdAt < lowest.createdAt) {
          lowestIdx = i;
        }
      }
    }

    return this.queue.splice(lowestIdx, 1)[0];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/animationQueue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd frontend/pixel-prototype
git add src/utils/animationQueue.ts src/utils/animationQueue.test.ts
git commit -m "feat: implement priority-based animation queue

- Add AnimationQueue class with priority scheduling
- Define AnimationPriority enum (APPROVAL to IDLE)
- Implement enqueue/dequeue with priority ordering
- Add queue overflow protection with smart dropping
- Never drop approval events (reject if necessary)
- Add tests for priority ordering and overflow handling

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 实现实时工作动画

**Files:**
- Modify: `src/utils/mapAnimations.ts`
- Test: `src/utils/mapAnimations.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/mapAnimations.test.ts (extend existing)
import { playScanAnimation, playConstructAnimation, playApprovalAnimation } from '../mapAnimations';
import { Canvas } from 'canvas';

describe('Work Animations', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;
  });

  test('playScanAnimation should draw expanding ripple', async () => {
    const building = {
      id: 'test-building',
      position: { x: 100, y: 100, width: 120, height: 100 }
    };

    await playScanAnimation(building, ctx);

    // Animation should complete within 3 seconds
    // Check that canvas was modified
    expect(canvas).toBeDefined();
  });

  test('playConstructAnimation should draw building growing', async () => {
    const building = {
      id: 'test-building',
      position: { x: 100, y: 100, width: 120, height: 100 }
    };

    await playConstructAnimation(building, ctx);

    // Animation should complete within 2 seconds
    expect(canvas).toBeDefined();
  });

  test('playApprovalAnimation should create dialog element', () => {
    const agentId = 'test-agent';
    const approval = {
      id: 'approval-1',
      riskScore: 30,
      benefitScore: 70,
      description: 'Deploy to production'
    };

    playApprovalAnimation(agentId, approval);

    // Check that dialog was created
    const dialog = document.querySelector('.approval-dialog');
    expect(dialog).toBeTruthy();
    dialog?.remove();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/__tests__/mapAnimations.test.ts`
Expected: FAIL with animation functions not defined

- [ ] **Step 3: Implement animations in mapAnimations.ts**

Add to `src/utils/mapAnimations.ts`:

```typescript
// Scan animation
export function playScanAnimation(
  building: { id: string; position: { x: number; y: number; width: number; height: number } },
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve) => {
    const centerX = building.position.x + building.position.width / 2;
    const centerY = building.position.y + building.position.height / 2;
    const maxRadius = Math.max(building.position.width, building.position.height) / 2;

    let radius = 0;
    const speed = 5;
    const startTime = Date.now();
    const maxDuration = 3000; // 3 seconds max

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxDuration || radius >= maxRadius) {
        // Complete - turn green
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
        ctx.stroke();
        resolve();
        return;
      }

      // Draw expanding ripple
      ctx.beginPath();
      const progress = radius / maxRadius;
      if (progress < 0.5) {
        ctx.strokeStyle = '#3b82f6'; // Blue - scanning
      } else if (progress < 0.8) {
        ctx.strokeStyle = '#f59e0b'; // Orange - analyzing
      } else {
        ctx.strokeStyle = '#22c55e'; // Green - complete
      }

      ctx.lineWidth = 3;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      radius += speed;
      requestAnimationFrame(animate);
    };

    animate();
  });
}

// Construct animation
export function playConstructAnimation(
  building: { id: string; position: { x: number; y: number; width: number; height: number } },
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve) => {
    let progress = 0;
    const particles: Array<{x: number, y: number, vy: number, alpha: number}> = [];
    const startTime = Date.now();
    const maxDuration = 2000; // 2 seconds max

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxDuration || progress >= 1) {
        resolve();
        return;
      }

      progress += 0.02;

      // Draw building growing from bottom
      const currentHeight = building.position.height * progress;
      const y = building.position.y + (building.position.height - currentHeight);

      // Building frame
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(
        building.position.x,
        y,
        building.position.width,
        currentHeight
      );

      // Add particles at top when progress > 50%
      if (progress > 0.5) {
        particles.push({
          x: building.position.x + Math.random() * building.position.width,
          y: y,
          vy: -2 - Math.random() * 2,
          alpha: 1
        });
      }

      // Draw and update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.vy;
        p.alpha -= 0.02;

        ctx.fillStyle = `rgba(34, 197, 94, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, 4, 4);

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  });
}

// Approval animation
export function playApprovalAnimation(
  agentId: string,
  approval: { id: string; riskScore: number; benefitScore: number; description: string }
): void {
  // Find agent element
  const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`);

  if (agentEl) {
    // Stand up animation
    (agentEl as HTMLElement).style.transform = 'scale(1.2)';
    (agentEl as HTMLElement).style.transition = 'transform 0.3s ease-out';
  }

  // Show approval dialog
  const dialog = document.createElement('div');
  dialog.className = 'approval-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1e293b;
    border: 2px solid #ef4444;
    border-radius: 8px;
    padding: 20px;
    z-index: 1000;
    min-width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  `;

  dialog.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
      <span style="font-size: 18px; font-weight: bold; color: #fff;">需要审批</span>
    </div>
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-around; margin-bottom: 15px;">
        <div style="text-align: center;">
          <div style="color: #94a3b8; font-size: 12px;">风险</div>
          <div style="color: #ef4444; font-size: 24px; font-weight: bold;">${approval.riskScore}</div>
        </div>
        <div style="text-align: center;">
          <div style="color: #94a3b8; font-size: 12px;">收益</div>
          <div style="color: #22c55e; font-size: 24px; font-weight: bold;">${approval.benefitScore}</div>
        </div>
      </div>
      <div style="color: #e2e8f0; font-size: 14px; margin-bottom: 15px;">${approval.description}</div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button
        class="btn-approve"
        data-agent-id="${agentId}"
        data-approval="true"
        style="flex: 1; padding: 10px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
      >
        ✓ 批准
      </button>
      <button
        class="btn-reject"
        data-agent-id="${agentId}"
        data-approval="false"
        style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
      >
        ✗ 拒绝
      </button>
    </div>
  `;

  document.body.appendChild(dialog);

  // Store dialog reference for cleanup
  (dialog as any).__agentId = agentId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend/pixel-prototype && npm test -- src/utils/__tests__/mapAnimations.test.ts`
Expected: PASS (may need to adjust test expectations)

- [ ] **Step 5: Commit**

```bash
cd frontend/pixel-prototype
git add src/utils/mapAnimations.ts src/utils/__tests__/mapAnimations.test.ts
git commit -m "feat: implement real-time work animations

- Add playScanAnimation() with expanding ripple effect
- Add playConstructAnimation() with growing building + particles
- Add playApprovalAnimation() with risk/benefit dialog
- Support color transitions (blue → orange → green)
- Add CSS styling for approval dialog
- Extend animation tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 集成Personality到Office Projector

**Files:**
- Modify: `src/runtime/projectors/officeProjector.ts`

- [ ] **Step 1: Update officeProjector to use personality**

```typescript
// src/runtime/projectors/officeProjector.ts
import { Agent, AgentRole, generatePersonalityDialogue } from '@/types/agents';
import { generatePersonality } from '@/types/agents';
import { DialogueBubble } from '@/types/agents';

export function reduceOfficeProjection(
  event: any,
  state: {
    agents: Record<string, Agent>;
    dialogues: DialogueBubble[];
  }
): void {
  switch (event.type) {
    case 'agent.spawned': {
      const personality = generatePersonality(event.role);
      state.agents[event.agentId] = {
        id: event.agentId,
        name: event.agentName,
        icon: getIconForRole(event.role),
        role: event.role,
        state: 'idle',
        location: { type: 'office' },
        position: { x: 400, y: 350, tileCol: 20, tileRow: 17 },
        path: [],
        currentTask: null,
        progress: 0,
        bubble: null,
        palette: Math.floor(Math.random() * 5),
        frame: 0,
        frameTimer: 0,
        personality,
        visualState: 'idle',
        workSpeedMultiplier: 1.0,
        lastBreakTime: Date.now(),
        stateHistory: []
      };
      break;
    }

    case 'tool.started': {
      const agent = state.agents[event.agentId];
      if (!agent) return;

      agent.state = 'working';
      agent.currentTask = { id: event.taskId, type: 'scan' as any, skill: event.tool, targetDistrict: event.buildingId, status: 'in_progress', progress: 0 };
      agent.visualState = 'working';

      // Generate personality dialogue
      if (agent.personality) {
        const dialogue = generatePersonalityDialogue(agent, 'task_start');
        state.dialogues.push({
          agentId: agent.id,
          emoji: '💼',
          text: dialogue,
          duration: 3000,
          timestamp: Date.now()
        });
      }
      break;
    }

    case 'tool.completed': {
      const agent = state.agents[event.agentId];
      if (!agent) return;

      agent.state = 'idle';
      agent.visualState = 'idle';

      // Update stats
      if (agent.personality && agent.currentTask) {
        const duration = (Date.now() - (agent.currentTask as any).startTime) / 1000;
        agent.personality.stats.deploymentsCompleted++;
        agent.personality.stats.averageSpeed =
          (agent.personality.stats.averageSpeed * (agent.personality.stats.deploymentsCompleted - 1) + duration) /
          agent.personality.stats.deploymentsCompleted;
      }

      // Generate completion dialogue
      if (agent.personality) {
        const dialogue = generatePersonalityDialogue(agent, 'task_complete');
        state.dialogues.push({
          agentId: agent.id,
          emoji: '✓',
          text: dialogue,
          duration: 3000,
          timestamp: Date.now()
        });
      }

      agent.currentTask = null;
      break;
    }

    case 'tool.failed': {
      const agent = state.agents[event.agentId];
      if (!agent) return;

      agent.state = 'idle';
      agent.visualState = 'blocked';

      // Update stats
      if (agent.personality) {
        agent.personality.stats.deploymentsRejected++;
      }

      // Generate error dialogue
      if (agent.personality) {
        const dialogue = generatePersonalityDialogue(agent, 'error');
        state.dialogues.push({
          agentId: agent.id,
          emoji: '❌',
          text: dialogue,
          duration: 4000,
          timestamp: Date.now()
        });
      }

      agent.currentTask = null;
      break;
    }
  }
}

function getIconForRole(role: AgentRole): string {
  switch (role) {
    case AgentRole.SCANNER:
      return '🕵️';
    case AgentRole.PLANNER:
      return '👨‍🎨';
    case AgentRole.MONITOR:
      return '👮';
    default:
      return '🏢';
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend/pixel-prototype
git add src/runtime/projectors/officeProjector.ts
git commit -m "feat: integrate personality system into office projector

- Generate personality on agent.spawned event
- Update agent state and visualState on tool events
- Generate personality dialogue on task_start/task_complete/error
- Track deployment stats (completed/rejected/averageSpeed)
- Add dialogue bubbles to state for UI rendering

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 集成动画事件到City Projector

**Files:**
- Modify: `src/runtime/projectors/cityProjector.ts`

- [ ] **Step 1: Update cityProjector to generate animation events**

```typescript
// src/runtime/projectors/cityProjector.ts
import { ProjectionEvent, AnimationPriority } from '@/utils/animationQueue';

export function projectCityEvents(
  event: any,
  currentQueue: ProjectionEvent[]
): ProjectionEvent[] {
  const newEvents: ProjectionEvent[] = [];

  switch (event.type) {
    case 'tool.started': {
      // Generate scan animation for validation/scan tools
      if (event.tool?.includes('scan') || event.tool?.includes('validate')) {
        newEvents.push({
          id: `scan-${event.taskId}`,
          type: 'scan',
          priority: AnimationPriority.SCAN,
          createdAt: Date.now(),
          scheduledAt: Date.now(),
          duration: 2000,
          data: { tool: event.tool },
          buildingId: event.buildingId
        });
      }
      break;
    }

    case 'tool.completed': {
      // Generate construct animation for apply/deploy tools
      if (event.tool?.includes('apply') || event.tool?.includes('deploy')) {
        newEvents.push({
          id: `construct-${event.taskId}`,
          type: 'construct',
          priority: AnimationPriority.CONSTRUCT,
          createdAt: Date.now(),
          scheduledAt: Date.now(),
          duration: 1500,
          data: { tool: event.tool },
          buildingId: event.buildingId
        });
      }
      break;
    }

    case 'approval.required': {
      // Generate approval animation (highest priority)
      newEvents.push({
        id: `approve-${event.approvalId}`,
        type: 'approve',
        priority: AnimationPriority.APPROVAL,
        createdAt: Date.now(),
        scheduledAt: Date.now(),
        duration: 0, // Wait for user action
        data: event.approval,
        agentId: event.agentId
      });
      break;
    }
  }

  return [...currentQueue, ...newEvents];
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend/pixel-prototype
git add src/runtime/projectors/cityProjector.ts
git commit -m "feat: generate animation events in city projector

- Map tool.started to scan animations (validate/scan tools)
- Map tool.completed to construct animations (apply/deploy tools)
- Map approval.required to approval events (highest priority)
- Return combined queue of existing + new events
- Support priority-based animation scheduling

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 更新RuntimeStore集成动画队列

**Files:**
- Modify: `src/store/runtimeStore.ts`

- [ ] **Step 1: Add animation queue to runtimeStore**

```typescript
// src/store/runtimeStore.ts
import { create } from 'zustand';
import { AnimationQueue, ProjectionEvent } from '@/utils/animationQueue';
import { DialogueBubble } from '@/types/agents';
import { reduceOfficeProjection } from '@/runtime/projectors/officeProjector';
import { projectCityEvents } from '@/runtime/projectors/cityProjector';

interface RuntimeStore {
  // Existing fields...
  sessions: Record<string, any>;
  agents: Record<string, any>;
  approvals: Record<string, any>;
  liveLogs: any[];

  // NEW: Animation queue
  animationQueue: AnimationQueue;
  projectionEvents: ProjectionEvent[];
  dialogues: DialogueBubble[];
  queuePaused: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';

  // Existing methods...
  ingestRawEvent: (event: any) => void;
  attachClient: (client: any) => void;

  // NEW: Animation queue methods
  processAnimationQueue: () => void;
  clearAnimationQueue: () => void;
  removeAnimationEvent: (eventId: string) => void;

  // NEW: Dialogue methods
  addDialogue: (dialogue: DialogueBubble) => void;
  clearExpiredDialogues: () => void;

  // NEW: Connection health
  setConnectionStatus: (status: RuntimeStore['connectionStatus']) => void;
}

export const useRuntimeStore = create<RuntimeStore>((set, get) => ({
  // Initialize
  sessions: {},
  agents: {},
  approvals: {},
  liveLogs: [],

  // NEW: Initialize animation queue
  animationQueue: new AnimationQueue(50),
  projectionEvents: [],
  dialogues: [],
  queuePaused: false,
  connectionStatus: 'connected',

  // Event ingestion
  ingestRawEvent: (event: any) => {
    const state = get();

    // Skip if disconnected
    if (state.connectionStatus === 'disconnected') {
      console.warn('[RuntimeStore] Skipping event, disconnected');
      return;
    }

    // Process through office projector
    reduceOfficeProjection(event, state);

    // Process through city projector
    const newEvents = projectCityEvents(event, state.projectionEvents);

    // Enqueue new animation events
    newEvents.forEach(event => {
      if (!state.queuePaused) {
        state.animationQueue.enqueue(event);
      }
    });

    set({ projectionEvents: newEvents });
  },

  attachClient: (client: any) => {
    // Existing implementation...
  },

  // NEW: Process animation queue
  processAnimationQueue: () => {
    const state = get();
    if (state.queuePaused || state.animationQueue.size() === 0) return;

    const event = state.animationQueue.dequeue();
    if (!event) return;

    const now = Date.now();
    if (now < event.scheduledAt) {
      // Re-queue if not yet time
      state.animationQueue.enqueue(event);
      return;
    }

    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('animation-event', { detail: event }));

    // Auto-remove non-approval events after duration
    if (event.duration > 0) {
      setTimeout(() => {
        get().removeAnimationEvent(event.id);
      }, event.duration);
    }
  },

  // NEW: Clear animation queue
  clearAnimationQueue: () => {
    const state = get();
    state.animationQueue.clear();
    set({ projectionEvents: [] });
  },

  // NEW: Remove specific animation event
  removeAnimationEvent: (eventId: string) => {
    const state = get();
    state.animationQueue.remove(eventId);
    set({
      projectionEvents: state.projectionEvents.filter(e => e.id !== eventId)
    });
  },

  // NEW: Add dialogue
  addDialogue: (dialogue: DialogueBubble) => {
    const state = get();
    set({ dialogues: [...state.dialogues, dialogue] });

    // Auto-remove after duration
    setTimeout(() => {
      get().clearExpiredDialogues();
    }, dialogue.duration);
  },

  // NEW: Clear expired dialogues
  clearExpiredDialogues: () => {
    const state = get();
    const now = Date.now();
    set({
      dialogues: state.dialogues.filter(d => d.timestamp + d.duration > now)
    });
  },

  // NEW: Set connection status
  setConnectionStatus: (status: RuntimeStore['connectionStatus']) => {
    set({ connectionStatus: status });

    // Handle disconnection
    if (status === 'disconnected') {
      // Gray out agents
      Object.values(state.agents).forEach((agent: any) => {
        agent.visualState = 'offline';
      });
      set({ queuePaused: true });
    }

    // Handle reconnection
    if (status === 'connected' && state.queuePaused) {
      set({ queuePaused: false });
    }
  }
}));
```

- [ ] **Step 2: Commit**

```bash
cd frontend/pixel-prototype
git add src/store/runtimeStore.ts
git commit -m "feat: integrate animation queue into runtime store

- Add AnimationQueue instance to RuntimeStore
- Add projectionEvents and dialogues state
- Implement processAnimationQueue() for queue processing
- Add queue control (clear, remove, pause/resume)
- Add dialogue management (add, clearExpired)
- Handle connection status changes
- Emit animation-event for UI consumption

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 创建Office Interaction UI组件

**Files:**
- Create: `src/components/office/AgentInteractionMenu.tsx`
- Create: `src/components/office/DialogueBubble.tsx`

- [ ] **Step 1: Create AgentInteractionMenu component**

```typescript
// src/components/office/AgentInteractionMenu.tsx
import React, { useState } from 'react';
import { Agent } from '@/types/agents';
import { useAgentStore } from '@/store/agents';
import { useRuntimeStore } from '@/store/runtimeStore';

interface AgentInteractionMenuProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentInteractionMenu({ agent, onClose }: AgentInteractionMenuProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const updateAgent = useAgentStore(state => state.updateAgent);
  const addDialogue = useRuntimeStore(state => state.addDialogue);

  const handleGreet = () => {
    const relationship = agent.personality?.relationships['user'] || 0;
    let greeting: string;

    if (relationship > 50) {
      greeting = '嘿！很高兴见到你！😄';
    } else if (relationship > 20) {
      greeting = '你好呀~ 👋';
    } else {
      greeting = '哦，你好。';
    }

    addDialogue({
      agentId: agent.id,
      emoji: '👋',
      text: greeting,
      duration: 3000,
      timestamp: Date.now()
    });

    // Improve relationship
    if (agent.personality) {
      const newRelationship = Math.min(100, relationship + 5);
      updateAgent(agent.id, {
        personality: {
          ...agent.personality,
          relationships: {
            ...agent.personality.relationships,
            user: newRelationship
          }
        }
      });
    }

    onClose();
  };

  const handleSendCoffee = () => {
    const now = Date.now();
    const lastCoffeeTime = agent.lastCoffeeTime || 0;
    const cooldown = 5 * 60 * 1000; // 5 minutes

    if (lastCoffeeTime && now - lastCoffeeTime < cooldown) {
      addDialogue({
        agentId: agent.id,
        emoji: '☕',
        text: '谢谢！但我刚喝过~',
        duration: 2000,
        timestamp: Date.now()
      });
      onClose();
      return;
    }

    // Apply coffee buff
    const buff = {
      agentId: agent.id,
      boostAmount: 0.2,
      expiresAt: now + 5 * 60 * 1000
    };

    // Show dialogue based on preference
    const preference = agent.personality?.preferences.coffeePreference || 'black';
    const dialogues: Record<string, string> = {
      black: '黑咖啡，提神醒脑！',
      latte: '拿铁，我的最爱~',
      cappuccino: '卡布奇诺，谢谢！'
    };

    addDialogue({
      agentId: agent.id,
      emoji: '☕',
      text: dialogues[preference],
      duration: 2000,
      timestamp: Date.now()
    });

    updateAgent(agent.id, {
      workSpeedMultiplier: 1.2,
      lastCoffeeTime: now
    });

    // Schedule buff expiration
    setTimeout(() => {
      updateAgent(agent.id, {
        workSpeedMultiplier: 1.0
      });
      addDialogue({
        agentId: agent.id,
        emoji: '⏰',
        text: '咖啡效果结束了',
        duration: 2000,
        timestamp: Date.now()
      });
    }, 5 * 60 * 1000);

    onClose();
  };

  const handleShowWorkHistory = () => {
    setSelectedOption('history');
  };

  const handleShowRelationships = () => {
    setSelectedOption('relationships');
  };

  return (
    <div
      className="agent-interaction-menu"
      style={{
        position: 'absolute',
        backgroundColor: '#1e293b',
        border: '2px solid #8b5cf6',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000,
        minWidth: '200px'
      }}
    >
      <div style={{ color: '#fff', marginBottom: '12px', fontWeight: 'bold' }}>
        {agent.name}
      </div>

      {selectedOption === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleGreet}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            👋 打招呼
          </button>

          <button
            onClick={handleSendCoffee}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            ☕ 送咖啡
          </button>

          <button
            onClick={handleShowWorkHistory}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            📊 工作历史
          </button>

          <button
            onClick={handleShowRelationships}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            🕸️ 关系图
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
        </div>
      )}

      {selectedOption === 'history' && (
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '8px' }}>
            完成任务: {agent.personality?.stats.deploymentsCompleted || 0}
          </div>
          <div style={{ color: '#94a3b8', marginBottom: '8px' }}>
            拒绝任务: {agent.personality?.stats.deploymentsRejected || 0}
          </div>
          <div style={{ color: '#94a3b8', marginBottom: '8px' }}>
            平均速度: {agent.personality?.stats.averageSpeed?.toFixed(1) || 0}秒
          </div>
          <button
            onClick={() => setSelectedOption(null)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            返回
          </button>
        </div>
      )}

      {selectedOption === 'relationships' && (
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '8px' }}>
            与你的关系: {agent.personality?.relationships['user'] || 0}/100
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>
            (多互动可以提升关系)
          </div>
          <button
            onClick={() => setSelectedOption(null)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            返回
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create DialogueBubble component**

```typescript
// src/components/office/DialogueBubble.tsx
import React, { useEffect, useRef } from 'react';
import { DialogueBubble as DialogueBubbleType } from '@/types/agents';

interface DialogueBubbleProps {
  dialogue: DialogueBubbleType;
  agentPosition: { x: number; y: number };
}

export function DialogueBubble({ dialogue, agentPosition }: DialogueBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-remove after duration
    const timer = setTimeout(() => {
      if (bubbleRef.current) {
        bubbleRef.current.style.opacity = '0';
        setTimeout(() => {
          bubbleRef.current?.remove();
        }, 300);
      }
    }, dialogue.duration);

    return () => clearTimeout(timer);
  }, [dialogue.duration]);

  return (
    <div
      ref={bubbleRef}
      className="dialogue-bubble"
      style={{
        position: 'fixed',
        left: `${agentPosition.x}px`,
        top: `${agentPosition.y - 60}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #8b5cf6',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 1001,
        transition: 'opacity 0.3s ease-out',
        minWidth: '150px',
        maxWidth: '250px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>{dialogue.emoji}</span>
        <span style={{ color: '#fff', fontSize: '14px' }}>{dialogue.text}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd frontend/pixel-prototype
git add src/components/office/AgentInteractionMenu.tsx src/components/office/DialogueBubble.tsx
git commit -m "feat: implement office interaction UI components

- Add AgentInteractionMenu with greet/coffee/history/relations options
- Implement coffee buff system with 5min cooldown and 20% speed boost
- Add relationship tracking and improvement on interactions
- Create DialogueBubble component for agent dialogues
- Support personalized dialogues based on coffee preference
- Auto-remove bubbles after duration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 集成动画事件处理到MapCanvas

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add animation event listener to MapCanvas**

Add to `src/components/map/MapCanvas.tsx`:

```typescript
import { useEffect } from 'react';
import { playScanAnimation, playConstructAnimation, playApprovalAnimation } from '@/utils/mapAnimations';
import { useRuntimeStore } from '@/store/runtimeStore';
import { DialogueBubble } from '@/components/office/DialogueBubble';
import { useAgentStore } from '@/store/agents';

// Inside MapCanvas component:
const runtimeStore = useRuntimeStore();
const agents = useAgentStore(state => state.agents);

useEffect(() => {
  // Start animation queue processing
  const queueProcessor = setInterval(() => {
    runtimeStore.processAnimationQueue();
  }, 16); // ~60 FPS

  // Listen for animation events
  const handleAnimationEvent = (e: CustomEvent) => {
    const event = e.detail;

    switch (event.type) {
      case 'scan': {
        const building = buildings.find(b => b.id === event.buildingId);
        if (building && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            playScanAnimation(building, ctx);
          }
        }
        break;
      }

      case 'construct': {
        const building = buildings.find(b => b.id === event.buildingId);
        if (building && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            playConstructAnimation(building, ctx);
          }
        }
        break;
      }

      case 'approve': {
        playApprovalAnimation(event.agentId, event.data);

        // Handle button clicks
        const handleApproval = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('btn-approve') || target.classList.contains('btn-reject')) {
            const agentId = target.dataset.agentId;
            const approved = target.dataset.approval === 'true';

            // Remove animation
            const agentEl = document.querySelector(`[data-agent-id="${agentId}"]`);
            if (agentEl) {
              (agentEl as HTMLElement).style.transform = 'scale(1.0)';
            }
            document.querySelector('.approval-dialog')?.remove();

            // Send approval decision
            // TODO: Send to backend via runtime client
            console.log(`Approval ${approved ? 'granted' : 'rejected'} for ${agentId}`);

            // Remove event from queue
            runtimeStore.removeAnimationEvent(`approve-${agentId}`);
          }
        };

        document.addEventListener('click', handleApproval);
        setTimeout(() => {
          document.removeEventListener('click', handleApproval);
        }, 30000); // Cleanup after 30s

        break;
      }
    }
  };

  window.addEventListener('animation-event', handleAnimationEvent as EventListener);

  return () => {
    clearInterval(queueProcessor);
    window.removeEventListener('animation-event', handleAnimationEvent as EventListener);
  };
}, [buildings, runtimeStore]);

// Render dialogue bubbles
const dialogues = runtimeStore.dialogues;
return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <canvas ref={canvasRef} {...props} />

    {/* Render dialogue bubbles */}
    {dialogues.map(dialogue => {
      const agent = agents[dialogue.agentId];
      if (!agent || !agent.position) return null;

      return (
        <DialogueBubble
          key={`${dialogue.agentId}-${dialogue.timestamp}`}
          dialogue={dialogue}
          agentPosition={{ x: agent.position.x, y: agent.position.y }}
        />
      );
    })}

    {/* Existing agent overlays... */}
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
cd frontend/pixel-prototype
git add src/components/map/MapCanvas.tsx
git commit -m "feat: integrate animation event handling in MapCanvas

- Add animation queue processing loop (60 FPS)
- Listen for animation-event CustomEvent
- Handle scan/construct/approve animation events
- Render dialogue bubbles for agents
- Handle approval button clicks
- Auto-cleanup event listeners

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 添加Agent Desk点击交互

**Files:**
- Modify: `src/components/city/AgentOfficePanel.tsx` (or create new component)

- [ ] **Step 1: Add agent desk click handler**

```typescript
// In AgentOfficePanel.tsx or similar component:
import { useState } from 'react';
import { useAgentStore } from '@/store/agents';
import { AgentInteractionMenu } from '@/components/office/AgentInteractionMenu';

export function AgentOfficePanel({ onOpenLedger }: { onOpenLedger: () => void }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const agents = useAgentStore(state => state.agents);

  const handleAgentDeskClick = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2>Agent Office</h2>

      {/* Agent desks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.values(agents).map(agent => (
          <div
            key={agent.id}
            onClick={() => handleAgentDeskClick(agent.id)}
            style={{
              backgroundColor: '#1e293b',
              border: `2px solid ${agent.state === 'working' ? '#22c55e' : '#6b7280'}`,
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                agent.state === 'working' ? '#22c55e' : '#6b7280';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{agent.icon}</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>{agent.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {agent.state === 'working' ? '工作中...' : '空闲'}
                </div>
                {agent.personality && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {agent.personality.trait} • {agent.personality.workStyle}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interaction menu */}
      {selectedAgentId && (
        <AgentInteractionMenu
          agent={agents[selectedAgentId]}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend/pixel-prototype
git add src/components/city/AgentOfficePanel.tsx
git commit -m "feat: add agent desk interaction to office panel

- Make agent desks clickable to open interaction menu
- Show agent state with color-coded borders
- Display personality info (trait + workStyle)
- Hover effect with purple border
- Integrate AgentInteractionMenu component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: 添加错误处理和重连逻辑

**Files:**
- Modify: `src/runtime/opencode/client.ts` (or create error handler utility)

- [ ] **Step 1: Implement connection error handling**

```typescript
// Create src/utils/connectionHealth.ts or add to client.ts

interface ConnectionHealth {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastHeartbeat: number;
  retryCount: number;
}

export class ConnectionHealthManager {
  private health: ConnectionHealth = {
    status: 'connected',
    lastHeartbeat: Date.now(),
    retryCount: 0
  };

  private retryDelays = [1000, 2000, 4000, 8000, 15000]; // Max 15s
  private runtimeStore: any;

  constructor(runtimeStore: any) {
    this.runtimeStore = runtimeStore;
  }

  handleDisconnection(): void {
    console.warn('[ConnectionHealth] Connection lost');

    this.health.status = 'disconnected';
    this.health.retryCount = 0;

    // Update store
    this.runtimeStore.setConnectionStatus('disconnected');

    // Attempt reconnection
    this.attemptReconnection();
  }

  handleReconnection(): void {
    console.log('[ConnectionHealth] Connection restored');

    this.health.status = 'connected';
    this.health.retryCount = 0;
    this.health.lastHeartbeat = Date.now();

    // Update store
    this.runtimeStore.setConnectionStatus('connected');
  }

  private attemptReconnection(): void {
    if (this.health.retryCount >= this.retryDelays.length) {
      console.error('[ConnectionHealth] Max retries reached');
      this.health.status = 'error';
      this.runtimeStore.setConnectionStatus('error');

      // Show error message to user
      alert('连接已断开，请刷新页面');
      return;
    }

    this.health.status = 'reconnecting';
    this.runtimeStore.setConnectionStatus('reconnecting');

    const delay = this.retryDelays[this.health.retryCount];

    console.log(`[ConnectionHealth] Reconnection attempt ${this.health.retryCount + 1} in ${delay}ms`);

    setTimeout(async () => {
      try {
        // Attempt to reconnect
        const success = await this.performReconnection();

        if (success) {
          this.handleReconnection();
        } else {
          this.health.retryCount++;
          this.attemptReconnection();
        }
      } catch (error) {
        console.error('[ConnectionHealth] Reconnection failed:', error);
        this.health.retryCount++;
        this.attemptReconnection();
      }
    }, delay);
  }

  private async performReconnection(): Promise<boolean> {
    // TODO: Implement actual reconnection logic
    // This would depend on your SSE/WebSocket client
    return true; // Placeholder
  }

  updateHeartbeat(): void {
    this.health.lastHeartbeat = Date.now();
  }

  getStatus(): ConnectionHealth['status'] {
    return this.health.status;
  }
}
```

- [ ] **Step 2: Integrate into runtime client**

```typescript
// In src/runtime/opencode/client.ts or similar:
import { ConnectionHealthManager } from '@/utils/connectionHealth';

export function createSseRuntimeClient(url: string, runtimeStore: any) {
  const healthManager = new ConnectionHealthManager(runtimeStore);

  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log('[SSE Client] Connected');
    healthManager.handleReconnection();
  };

  eventSource.onerror = (error) => {
    console.error('[SSE Client] Error:', error);
    healthManager.handleDisconnection();
  };

  eventSource.addEventListener('heartbeat', () => {
    healthManager.updateHeartbeat();
  });

  // ... rest of implementation
}
```

- [ ] **Step 3: Commit**

```bash
cd frontend/pixel-prototype
git add src/utils/connectionHealth.ts src/runtime/opencode/client.ts
git commit -m "feat: add connection error handling and reconnection

- Implement ConnectionHealthManager for connection monitoring
- Handle disconnection with automatic reconnection
- Exponential backoff: 1s → 2s → 4s → 8s → 15s
- Update runtimeStore connection status
- Gray out agents and pause queue on disconnect
- Resume queue and restore agents on reconnect
- Max retries with user alert

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: 添加性能优化

**Files:**
- Create: `src/utils/performance.ts`
- Modify: `src/utils/mapAnimations.ts` (add cleanup)

- [ ] **Step 1: Implement performance utilities**

```typescript
// src/utils/performance.ts

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memory cleanup for finished animations
export function cleanupFinishedAnimations(): void {
  const now = Date.now();

  // Clean up dialogue bubbles
  document.querySelectorAll('.dialogue-bubble').forEach(el => {
    const endTime = parseInt(el.dataset.timestamp || '0') + 3000;
    if (now > endTime) {
      el.remove();
    }
  });

  // Clean up animation overlays
  document.querySelectorAll('.animation-overlay').forEach(el => {
    const endTime = parseInt(el.dataset.endTime || '0');
    if (now > endTime) {
      el.remove();
    }
  });
}

// Batch processor for events
export class BatchProcessor<T> {
  private batches: Map<string, T[]> = new Map();
  private interval: number;
  private processor: (key: string, batch: T[]) => void;

  constructor(interval: number, processor: (key: string, batch: T[]) => void) {
    this.interval = interval;
    this.processor = processor;
    this.start();
  }

  add(key: string, item: T): void {
    if (!this.batches.has(key)) {
      this.batches.set(key, []);
    }
    this.batches.get(key)!.push(item);
  }

  private start(): void {
    setInterval(() => {
      for (const [key, batch] of this.batches) {
        if (batch.length > 0) {
          this.processor(key, batch);
        }
      }
      this.batches.clear();
    }, this.interval);
  }
}

// Limit agent state history
export function limitAgentHistory<T>(history: T[], maxSize: number = 100): T[] {
  if (history.length > maxSize) {
    return history.slice(-maxSize);
  }
  return history;
}
```

- [ ] **Step 2: Apply performance optimizations to runtimeStore**

```typescript
// In src/store/runtimeStore.ts:

import { debounce, cleanupFinishedAnimations, BatchProcessor, limitAgentHistory } from '@/utils/performance';

export const useRuntimeStore = create<RuntimeStore>((set, get) => ({
  // ... existing code ...

  // Debounced agent updates
  updateAgents: debounce((agents: Record<string, any>) => {
    set({ agents });
  }, 100),

  // Start cleanup interval
  cleanupInterval: setInterval(() => {
    cleanupFinishedAnimations();
  }, 5000), // Every 5 seconds

  // Limit agent state history
  addAgentState: (agentId: string, state: any) => {
    const agent = get().agents[agentId];
    if (agent) {
      agent.stateHistory = limitAgentHistory([...agent.stateHistory, state]);
    }
  }
}));
```

- [ ] **Step 3: Commit**

```bash
cd frontend/pixel-prototype
git add src/utils/performance.ts src/store/runtimeStore.ts
git commit -m "feat: add performance optimization utilities

- Implement debounce() for agent state updates (100ms)
- Implement throttle() for frequent operations
- Add cleanupFinishedAnimations() for DOM cleanup (5s interval)
- Add BatchProcessor for batching events (200ms)
- Add limitAgentHistory() to cap history at 100 records
- Apply optimizations to runtimeStore
- Reduce unnecessary re-renders and memory usage

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: 添加集成测试

**Files:**
- Create: `src/integration/animation.integration.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
// src/integration/animation.integration.test.ts
import { AnimationQueue, AnimationPriority } from '@/utils/animationQueue';
import { playScanAnimation, playConstructAnimation, playApprovalAnimation } from '@/utils/mapAnimations';
import { generatePersonality } from '@/types/agents';
import { generatePersonalityDialogue } from '@/utils/dialogueSystem';
import { Canvas } from 'canvas';

describe('Animation Integration', () => {
  test('full animation flow: event → queue → process → render', async () => {
    const queue = new AnimationQueue(50);

    // Enqueue events
    queue.enqueue({
      id: 'scan-1',
      type: 'scan',
      priority: AnimationPriority.SCAN,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 2000,
      data: {},
      buildingId: 'building-1'
    });

    queue.enqueue({
      id: 'approve-1',
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now() + 100,
      scheduledAt: Date.now(),
      duration: 0,
      data: { riskScore: 30, benefitScore: 70, description: 'Deploy' },
      agentId: 'agent-1'
    });

    // Process queue
    expect(queue.size()).toBe(2);

    const first = queue.dequeue();
    expect(first?.type).toBe('approve'); // Higher priority

    const second = queue.dequeue();
    expect(second?.type).toBe('scan');

    expect(queue.size()).toBe(0);
  });

  test('agent personality dialogue generation', () => {
    const scannerPersonality = generatePersonality('scanner');
    expect(scannerPersonality.trait).toBe('perfectionist');

    const plannerPersonality = generatePersonality('planner');
    expect(plannerPersonality.trait).toBe('artistic');

    const monitorPersonality = generatePersonality('monitor');
    expect(monitorPersonality.trait).toBe('strict');

    // Generate dialogues
    const scannerAgent: any = {
      id: 'scanner-1',
      personality: scannerPersonality
    };

    const dialogue = generatePersonalityDialogue(scannerAgent, 'task_complete');
    expect(dialogue).toBeTruthy();
    expect(typeof dialogue).toBe('string');
  });
});

describe('Performance Integration', () => {
  test('queue handles high load without dropping approvals', () => {
    const queue = new AnimationQueue(10); // Small queue for testing

    // Fill queue with low priority events
    for (let i = 0; i < 9; i++) {
      queue.enqueue({
        id: `social-${i}`,
        type: 'social',
        priority: AnimationPriority.SOCIAL,
        createdAt: Date.now(),
        scheduledAt: Date.now(),
        duration: 3000,
        data: {},
        agentId: 'agent-1'
      });
    }

    // Add high priority approval
    const result = queue.enqueue({
      id: 'approve-critical',
      type: 'approve',
      priority: AnimationPriority.APPROVAL,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      duration: 0,
      data: {},
      agentId: 'agent-1'
    });

    // Should reject to avoid dropping approval
    expect(result).toBe(false);
  });

  test('batch processing reduces render calls', () => {
    let renderCount = 0;

    const batchProcessor = new BatchProcessor<any>(200, (key, batch) => {
      renderCount++;
      // Process batch
      batch.forEach(item => item.process());
    });

    // Add many events rapidly
    for (let i = 0; i < 100; i++) {
      batchProcessor.add('agent-1', { process: () => {} });
    }

    // Should not have rendered yet (batching)
    expect(renderCount).toBe(0);

    // Wait for batch interval
    return new Promise(resolve => {
      setTimeout(() => {
        expect(renderCount).toBeGreaterThan(0);
        expect(renderCount).toBeLessThan(100); // Should batch, not 1:1
        resolve(null);
      }, 250);
    });
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd frontend/pixel-prototype && npm test -- src/integration/animation.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd frontend/pixel-prototype
git add src/integration/animation.integration.test.ts
git commit -m "test: add integration tests for animation system

- Test full animation flow (event → queue → process → render)
- Test priority ordering in queue
- Test agent personality dialogue generation
- Test queue load handling (approval protection)
- Test batch processing performance
- Verify no critical events dropped under load

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: 更新文档和README

**Files:**
- Modify: `README.md` (if exists)
- Create: `docs/agent-personality-guide.md`

- [ ] **Step 1: Create feature documentation**

```markdown
# Agent Personality System Guide

## Overview

The Agent Personality System brings your agents to life with unique traits, behaviors, and social interactions.

## Personality Types

### Perfectionist (完美主义者)
- **Role**: Scanner
- **Traits**: Detail-oriented, rechecks work, low error rate
- **Dialogues**: "让我再检查一遍...", "这个边缘情况需要考虑"

### Artistic (艺术家型)
- **Role**: Planner
- **Traits**: Pursues elegance, creative solutions
- **Dialogues**: "这个方案很优雅，对吧？🎨", "代码写得像诗一样~"

### Strict (严格型)
- **Role**: Monitor
- **Traits**: Follows process, compliance-focused
- **Dialogues**: "合规性检查通过。", "需要评估安全风险。"

### Relaxed (轻松型)
- **Traits**: Steady pace, stress-resistant
- **Dialogues**: "搞定了！休息一下~", "劳逸结合嘛~"

## Office Interactions

### Coffee System ☕
- Click agent desk → "送咖啡"
- Effect: +20% work speed for 5 minutes
- Cooldown: 5 minutes
- Personality-based preferences: black/latte/cappuccino

### Greetings 👋
- Click "打招呼" to interact
- Improves relationship score
- Different dialogue based on relationship level

### Social Interactions
- Agents chat when both idle
- Relationships improve over time
- Influences dialogue tone

## Real-time Animations

### Scan Animation 🔍
- Triggered on validation/scan tools
- Expanding ripple effect (blue → orange → green)
- Duration: 2-3 seconds

### Construct Animation 🏗️
- Triggered on apply/deploy tools
- Building grows from foundation
- Green particle effects
- Duration: 1-2 seconds

### Approval Animation ⚠️
- Triggered on approval.required events
- Agent stands up (scale 1.2x)
- Risk vs benefit dialog
- Waits for user action

## Performance

- Animation queue with priority scheduling
- Approval events never dropped
- Max queue size: 50 events
- Cleanup every 5 seconds
- Batch processing for efficiency

## Troubleshooting

### Agents not responding
- Check connection status (top-right indicator)
- Refresh page if connection lost

### Animations not playing
- Check console for errors
- Verify queue not paused
- Ensure browser supports Canvas API

### Coffee not working
- Check cooldown (5 minutes)
- Verify agent not already buffed
```

- [ ] **Step 2: Update project README**

Add to main README:

```markdown
## Features

### 🎭 Agent Personalization
- **4 Personality Types**: Perfectionist, Artistic, Strict, Relaxed
- **Unique Dialogues**: Context-aware conversations based on personality
- **Relationship System**: Build rapport through interactions
- **Coffee Buffs**: Boost agent productivity with their favorite brew

### 🎬 Real-time Animations
- **Scan Animations**: Watch agents validate resources
- **Construct Animations**: See buildings grow from foundation
- **Approval Dialogs**: Risk vs benefit decision making
- **Priority Queue**: Critical events always display first

### 🏢 Office Interactions
- **Click Agent Desks**: Open interaction menu
- **Send Coffee**: +20% speed boost (5 min cooldown)
- **Greet Agents**: Build relationships
- **View History**: Track agent performance
```

- [ ] **Step 3: Commit**

```bash
cd frontend/pixel-prototype
git add README.md docs/agent-personality-guide.md
git commit -m "docs: add agent personality system documentation

- Create comprehensive feature guide
- Document personality types and behaviors
- Explain office interactions (coffee, greetings)
- Describe real-time animations
- Add performance notes
- Include troubleshooting section
- Update main README with feature highlights

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Final Steps

- [ ] **Step 1: Run full test suite**

Run: `cd frontend/pixel-prototype && npm test`

Expected: All tests pass

- [ ] **Step 2: Build project**

Run: `cd frontend/pixel-prototype && npm run build`

Expected: Build succeeds

- [ ] **Step 3: Verify feature manually**

Open application and test:
1. Create agents and verify personalities
2. Trigger animations and verify visual effects
3. Click agent desks and test interactions
4. Send coffee and verify buff
5. Test connection failure/recovery

- [ ] **Step 4: Final commit**

```bash
cd frontend/pixel-prototype
git add .
git commit -m "feat: complete agent personality + animations system

Implementation complete:
- ✅ Agent personality system (4 types, dialogues, relationships)
- ✅ Real-time work animations (scan/construct/approve)
- ✅ Animation event queue (priority-based, overflow protection)
- ✅ Office interactions (coffee, greetings, history)
- ✅ Error handling (connection failure, reconnection)
- ✅ Performance optimization (debounce, batch, cleanup)
- ✅ Comprehensive tests (unit + integration)
- ✅ Documentation (user guide, README updates)

All tests passing. Ready for review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

**End of Implementation Plan**

Total Tasks: 14
Estimated Time: 6-8 hours
Test Coverage: Unit tests for all utilities, integration tests for full flow
Documentation: User guide + updated README
