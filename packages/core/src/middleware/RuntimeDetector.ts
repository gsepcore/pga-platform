/**
 * RuntimeDetector (lightweight) — Runtime detection for quickStart() fallback
 *
 * Lighter version of create-gsep's detector. Reads package.json from cwd
 * to determine the best GSEP mode at runtime.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type RuntimeLevel = 'none' | 'chatbot' | 'agent-with-tools' | 'autonomous';
export type GSEPMode = 'quickstart' | 'quickstart-proactive' | 'middleware' | 'middleware-observer';

export interface RuntimeDetection {
    level: RuntimeLevel;
    mode: GSEPMode;
    framework?: string;
    provider?: string;
}

const FRAMEWORK_MAP: Array<{ packages: string[]; name: string; level: RuntimeLevel }> = [
    { packages: ['openclaw'], name: 'OpenClaw', level: 'autonomous' },
    { packages: ['autogpt', '@autogpt/core'], name: 'AutoGPT', level: 'autonomous' },
    { packages: ['crewai'], name: 'CrewAI', level: 'autonomous' },
    { packages: ['langchain', '@langchain/core'], name: 'LangChain', level: 'agent-with-tools' },
    { packages: ['llamaindex'], name: 'LlamaIndex', level: 'agent-with-tools' },
    { packages: ['ai', '@ai-sdk/openai', '@ai-sdk/anthropic'], name: 'Vercel AI', level: 'agent-with-tools' },
    { packages: ['@mastra/core'], name: 'Mastra', level: 'agent-with-tools' },
    { packages: ['@anthropic-ai/sdk'], name: 'Anthropic SDK', level: 'chatbot' },
    { packages: ['openai'], name: 'OpenAI SDK', level: 'chatbot' },
    { packages: ['@google/generative-ai'], name: 'Google AI', level: 'chatbot' },
    { packages: ['ollama'], name: 'Ollama', level: 'chatbot' },
];

/**
 * Detect runtime level from package.json in the current working directory.
 */
export function detectRuntime(cwd?: string): RuntimeDetection {
    const dir = cwd ?? process.cwd();
    const pkgPath = join(dir, 'package.json');

    if (!existsSync(pkgPath)) {
        return { level: 'none', mode: 'quickstart' };
    }

    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = Object.keys({
            ...(pkg.dependencies ?? {}),
            ...(pkg.devDependencies ?? {}),
        });

        // Check known frameworks (highest level wins)
        let bestMatch: { name: string; level: RuntimeLevel } | null = null;

        for (const fw of FRAMEWORK_MAP) {
            if (fw.packages.some(p => deps.includes(p))) {
                if (!bestMatch || levelRank(fw.level) > levelRank(bestMatch.level)) {
                    bestMatch = { name: fw.name, level: fw.level };
                }
            }
        }

        if (!bestMatch) {
            const hasAI = deps.some(d =>
                d.includes('openai') || d.includes('anthropic') ||
                d.includes('llm') || d.includes('gemini'),
            );
            return {
                level: hasAI ? 'chatbot' : 'none',
                mode: hasAI ? 'quickstart-proactive' : 'quickstart',
            };
        }

        // Detect provider
        let provider: string | undefined;
        if (deps.some(d => d.includes('anthropic'))) provider = 'anthropic';
        else if (deps.some(d => d.includes('openai'))) provider = 'openai';
        else if (deps.some(d => d.includes('google') || d.includes('gemini'))) provider = 'google';
        else if (deps.includes('ollama')) provider = 'ollama';

        const mode: GSEPMode = bestMatch.level === 'autonomous' ? 'middleware-observer'
            : bestMatch.level === 'agent-with-tools' ? 'middleware'
            : 'quickstart-proactive';

        return {
            level: bestMatch.level,
            mode,
            framework: bestMatch.name,
            provider,
        };
    } catch {
        return { level: 'none', mode: 'quickstart' };
    }
}

function levelRank(level: RuntimeLevel): number {
    return { none: 0, chatbot: 1, 'agent-with-tools': 2, autonomous: 3 }[level];
}
