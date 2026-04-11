// src/types/agents.test.ts
import { AgentPersonality, PersonalityTrait, generatePersonality } from './agents';
import { AgentRole } from './agents';

describe('AgentPersonality', () => {
  test('should generate perfectionist personality for SCANNER role', () => {
    const personality = generatePersonality(AgentRole.SCANNER);
    expect(personality.trait).toBe('perfectionist');
    expect(personality.quirks).toHaveLength(2);
    expect(personality.workStyle).toBe('thorough');
  });

  test('should generate artistic personality for PLANNER role', () => {
    const personality = generatePersonality(AgentRole.PLANNER);
    expect(personality.trait).toBe('artistic');
    expect(personality.workStyle).toBe('creative');
  });

  test('should generate strict personality for MONITOR role', () => {
    const personality = generatePersonality(AgentRole.MONITOR);
    expect(personality.trait).toBe('strict');
    expect(personality.workStyle).toBe('thorough');
  });

  test('should include all required personality fields', () => {
    const personality = generatePersonality(AgentRole.SCANNER);
    expect(personality).toHaveProperty('trait');
    expect(personality).toHaveProperty('quirks');
    expect(personality).toHaveProperty('workStyle');
    expect(personality).toHaveProperty('relationships');
    expect(personality).toHaveProperty('stats');
    expect(personality).toHaveProperty('preferences');
  });
});
