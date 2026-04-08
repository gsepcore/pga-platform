import { describe, it, expect, afterAll } from 'vitest';
import { detectRuntime } from '../RuntimeDetector.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ─── Helpers ────────────────────────────────────────────

function makeTempDir(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}): string {
    const dir = mkdtempSync(join(tmpdir(), 'gsep-rt-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
        name: 'test-project',
        dependencies: deps,
        devDependencies: devDeps,
    }));
    return dir;
}

const tempDirs: string[] = [];

function tracked(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}): string {
    const dir = makeTempDir(deps, devDeps);
    tempDirs.push(dir);
    return dir;
}

afterAll(() => {
    for (const dir of tempDirs) {
        try { rmSync(dir, { recursive: true }); } catch { /* ignore */ }
    }
});

// ─── Tests ──────────────────────────────────────────────

describe('RuntimeDetector', () => {
    // ─── No package.json ────────────────────────────────

    it('should return none/quickstart when no package.json exists', () => {
        const dir = mkdtempSync(join(tmpdir(), 'gsep-rt-empty-'));
        tempDirs.push(dir);

        const result = detectRuntime(dir);
        expect(result.level).toBe('none');
        expect(result.mode).toBe('quickstart');
    });

    // ─── Empty deps ─────────────────────────────────────

    it('should return none for empty dependencies', () => {
        const dir = tracked();
        const result = detectRuntime(dir);
        expect(result.level).toBe('none');
        expect(result.mode).toBe('quickstart');
    });

    // ─── Chatbot level ──────────────────────────────────

    it('should detect OpenAI SDK as chatbot', () => {
        const dir = tracked({ openai: '4.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('chatbot');
        expect(result.mode).toBe('quickstart-proactive');
        expect(result.framework).toBe('OpenAI SDK');
        expect(result.provider).toBe('openai');
    });

    it('should detect Anthropic SDK as chatbot', () => {
        const dir = tracked({ '@anthropic-ai/sdk': '0.10.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('chatbot');
        expect(result.framework).toBe('Anthropic SDK');
        expect(result.provider).toBe('anthropic');
    });

    it('should detect Google AI as chatbot', () => {
        const dir = tracked({ '@google/generative-ai': '1.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('chatbot');
        expect(result.framework).toBe('Google AI');
        expect(result.provider).toBe('google');
    });

    it('should detect Ollama as chatbot', () => {
        const dir = tracked({ ollama: '0.5.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('chatbot');
        expect(result.framework).toBe('Ollama');
        expect(result.provider).toBe('ollama');
    });

    // ─── Agent-with-tools level ─────────────────────────

    it('should detect LangChain as agent-with-tools', () => {
        const dir = tracked({ '@langchain/core': '0.3.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools');
        expect(result.mode).toBe('middleware');
        expect(result.framework).toBe('LangChain');
    });

    it('should detect Vercel AI SDK as agent-with-tools', () => {
        const dir = tracked({ ai: '3.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools');
        expect(result.framework).toBe('Vercel AI');
    });

    it('should detect @ai-sdk/openai as agent-with-tools', () => {
        const dir = tracked({ '@ai-sdk/openai': '1.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools');
        expect(result.framework).toBe('Vercel AI');
    });

    it('should detect Mastra as agent-with-tools', () => {
        const dir = tracked({ '@mastra/core': '0.1.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools');
        expect(result.framework).toBe('Mastra');
    });

    // ─── Autonomous level ───────────────────────────────

    it('should detect OpenClaw as autonomous', () => {
        const dir = tracked({ openclaw: '1.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('autonomous');
        expect(result.mode).toBe('middleware-observer');
        expect(result.framework).toBe('OpenClaw');
    });

    it('should detect CrewAI as autonomous', () => {
        const dir = tracked({ crewai: '0.5.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('autonomous');
        expect(result.framework).toBe('CrewAI');
    });

    // ─── Highest level wins ─────────────────────────────

    it('should pick highest level when multiple frameworks detected', () => {
        const dir = tracked({ openai: '4.0.0', '@langchain/core': '0.3.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools'); // higher than chatbot
        expect(result.framework).toBe('LangChain');
    });

    it('should pick autonomous over agent-with-tools', () => {
        const dir = tracked({ '@langchain/core': '0.3.0', openclaw: '1.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('autonomous');
        expect(result.framework).toBe('OpenClaw');
    });

    // ─── Provider detection ─────────────────────────────

    it('should detect provider from deps', () => {
        const dir = tracked({ '@langchain/core': '0.3.0', '@anthropic-ai/sdk': '0.10.0' });
        const result = detectRuntime(dir);
        expect(result.provider).toBe('anthropic');
    });

    // ─── Unknown AI package ─────────────────────────────

    it('should detect unknown AI package as chatbot', () => {
        const dir = tracked({ 'my-custom-llm-library': '1.0.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('chatbot');
        expect(result.mode).toBe('quickstart-proactive');
    });

    // ─── Invalid JSON ───────────────────────────────────

    it('should return none for invalid package.json', () => {
        const dir = mkdtempSync(join(tmpdir(), 'gsep-rt-bad-'));
        tempDirs.push(dir);
        writeFileSync(join(dir, 'package.json'), 'not json{{{');

        const result = detectRuntime(dir);
        expect(result.level).toBe('none');
        expect(result.mode).toBe('quickstart');
    });

    // ─── devDependencies ────────────────────────────────

    it('should detect frameworks in devDependencies', () => {
        const dir = tracked({}, { '@langchain/core': '0.3.0' });
        const result = detectRuntime(dir);
        expect(result.level).toBe('agent-with-tools');
        expect(result.framework).toBe('LangChain');
    });
});
