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
