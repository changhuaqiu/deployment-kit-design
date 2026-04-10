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
