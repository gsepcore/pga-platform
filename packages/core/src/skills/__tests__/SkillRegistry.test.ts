import { describe, it, expect } from 'vitest';
import { SkillRegistry } from '../SkillRegistry.js';

describe('SkillRegistry', () => {
    it('should register and retrieve inline skills', () => {
        const registry = new SkillRegistry();
        registry.registerInline('search', 'Web search', { type: 'object' }, async () => 'result');

        expect(registry.size).toBe(1);
        expect(registry.has('search')).toBe(true);

        const skill = registry.get('search');
        expect(skill?.name).toBe('search');
        expect(skill?.source).toBe('inline');
    });

    it('should register MCP skills', () => {
        const registry = new SkillRegistry();
        registry.registerMCP('github', 'GitHub API', 'http://localhost:3001/mcp');

        expect(registry.has('github')).toBe(true);
        expect(registry.get('github')?.source).toBe('mcp');
        expect(registry.get('github')?.mcpUri).toBe('http://localhost:3001/mcp');
    });

    it('should register multiple MCP tools at once', () => {
        const registry = new SkillRegistry();
        registry.registerMCPTools([
            { name: 'read', description: 'Read file', inputSchema: {} },
            { name: 'write', description: 'Write file', inputSchema: {} },
        ], 'http://localhost:3001/mcp');

        expect(registry.size).toBe(2);
        expect(registry.has('read')).toBe(true);
        expect(registry.has('write')).toBe(true);
    });

    it('should list all skills', () => {
        const registry = new SkillRegistry();
        registry.registerInline('a', 'A', {}, async () => '');
        registry.registerInline('b', 'B', {}, async () => '');

        const list = registry.list();
        expect(list.length).toBe(2);
    });

    it('should remove skills', () => {
        const registry = new SkillRegistry();
        registry.registerInline('temp', 'Temp', {}, async () => '');
        expect(registry.has('temp')).toBe(true);

        registry.remove('temp');
        expect(registry.has('temp')).toBe(false);
        expect(registry.size).toBe(0);
    });

    it('should track execution metrics', () => {
        const registry = new SkillRegistry();
        registry.registerInline('search', 'Search', {}, async () => '');

        registry.recordExecution('search', { success: true, output: 'ok', latencyMs: 100 });
        registry.recordExecution('search', { success: true, output: 'ok', latencyMs: 200 });
        registry.recordExecution('search', { success: false, output: '', latencyMs: 50, error: 'fail' });

        const skill = registry.get('search')!;
        expect(skill.metrics.totalCalls).toBe(3);
        expect(skill.metrics.successCount).toBe(2);
        expect(skill.metrics.failureCount).toBe(1);
        expect(skill.metrics.successRate).toBeCloseTo(0.667, 2);
        expect(skill.metrics.lastUsed).not.toBeNull();
    });

    it('should build tool definitions for LLM prompt', () => {
        const registry = new SkillRegistry();
        registry.registerInline('search', 'Web search', {
            type: 'object',
            properties: { query: { type: 'string' } },
        }, async () => '');

        const defs = registry.buildToolDefinitions();
        expect(defs.length).toBe(1);
        expect(defs[0].name).toBe('search');
        expect(defs[0].description).toContain('Web search');
        expect(defs[0].input_schema).toBeDefined();
    });

    it('should rank skills by success rate', () => {
        const registry = new SkillRegistry();
        registry.registerInline('good', 'Good', {}, async () => '');
        registry.registerInline('bad', 'Bad', {}, async () => '');

        registry.recordExecution('good', { success: true, output: '', latencyMs: 10 });
        registry.recordExecution('good', { success: true, output: '', latencyMs: 10 });
        registry.recordExecution('bad', { success: false, output: '', latencyMs: 10 });
        registry.recordExecution('bad', { success: true, output: '', latencyMs: 10 });

        const ranked = registry.getRankedSkills();
        expect(ranked[0].name).toBe('good');
        expect(ranked[1].name).toBe('bad');
    });
});
