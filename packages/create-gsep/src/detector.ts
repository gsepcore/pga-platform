/**
 * RuntimeDetector — Auto-detect agent type from project files
 *
 * Scans the target directory (or current directory for existing projects)
 * to determine what kind of agent the user has and configure GSEP accordingly.
 *
 * Detection levels:
 * 1. No agent     — no AI deps → quickStart() full runtime
 * 2. Basic chatbot — LLM SDK, no tools/loop → quickStart() + proactive hooks
 * 3. Agent with tools — function calling, memory → middleware() two hooks
 * 4. Autonomous agent — own loop (OpenClaw, etc.) → middleware() observer mode
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// ─── Types ──────────────────────────────────────────────

export type AgentLevel = 'none' | 'chatbot' | 'agent-with-tools' | 'autonomous';

export interface DetectionResult {
    level: AgentLevel;
    framework?: string;
    provider?: string;
    hasTools: boolean;
    hasMemory: boolean;
    hasLoop: boolean;
    hasScheduler: boolean;
    confidence: number;
    description: string;
    gsepMode: 'quickstart' | 'quickstart-proactive' | 'middleware' | 'middleware-observer';
    detectedDependencies: string[];
}

// ─── Known Frameworks ───────────────────────────────────

interface FrameworkSignature {
    name: string;
    packages: string[];
    level: AgentLevel;
    hasTools: boolean;
    hasMemory: boolean;
    hasLoop: boolean;
}

const KNOWN_FRAMEWORKS: FrameworkSignature[] = [
    // Autonomous agents (Level 4)
    {
        name: 'OpenClaw',
        packages: ['openclaw'],
        level: 'autonomous',
        hasTools: true,
        hasMemory: true,
        hasLoop: true,
    },
    {
        name: 'AutoGPT',
        packages: ['autogpt', '@autogpt/core'],
        level: 'autonomous',
        hasTools: true,
        hasMemory: true,
        hasLoop: true,
    },
    {
        name: 'CrewAI',
        packages: ['crewai'],
        level: 'autonomous',
        hasTools: true,
        hasMemory: true,
        hasLoop: true,
    },

    // Agents with tools (Level 3)
    {
        name: 'LangChain',
        packages: ['langchain', '@langchain/core', '@langchain/openai', '@langchain/anthropic'],
        level: 'agent-with-tools',
        hasTools: true,
        hasMemory: true,
        hasLoop: false,
    },
    {
        name: 'LlamaIndex',
        packages: ['llamaindex'],
        level: 'agent-with-tools',
        hasTools: true,
        hasMemory: true,
        hasLoop: false,
    },
    {
        name: 'Vercel AI SDK',
        packages: ['ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google'],
        level: 'agent-with-tools',
        hasTools: true,
        hasMemory: false,
        hasLoop: false,
    },
    {
        name: 'Mastra',
        packages: ['@mastra/core'],
        level: 'agent-with-tools',
        hasTools: true,
        hasMemory: true,
        hasLoop: false,
    },

    // Basic chatbots (Level 2)
    {
        name: 'Anthropic SDK',
        packages: ['@anthropic-ai/sdk'],
        level: 'chatbot',
        hasTools: false,
        hasMemory: false,
        hasLoop: false,
    },
    {
        name: 'OpenAI SDK',
        packages: ['openai'],
        level: 'chatbot',
        hasTools: false,
        hasMemory: false,
        hasLoop: false,
    },
    {
        name: 'Google Generative AI',
        packages: ['@google/generative-ai'],
        level: 'chatbot',
        hasTools: false,
        hasMemory: false,
        hasLoop: false,
    },
    {
        name: 'Ollama',
        packages: ['ollama'],
        level: 'chatbot',
        hasTools: false,
        hasMemory: false,
        hasLoop: false,
    },
];

// ─── Code Pattern Detection ─────────────────────────────

const TOOL_PATTERNS = [
    /function_call/i,
    /tool_use/i,
    /tools\s*:/,
    /function_calling/i,
    /tool_choice/i,
    /\.bind_tools\(/,
    /createTool/,
    /defineTool/,
];

const MEMORY_PATTERNS = [
    /ConversationBufferMemory/,
    /ChatMessageHistory/,
    /vectorStore/i,
    /embeddings/i,
    /\.remember\(/,
    /\.recall\(/,
    /pinecone|weaviate|chroma|qdrant/i,
];

const LOOP_PATTERNS = [
    /setInterval|setTimeout.*recursive/,
    /cron|schedule/i,
    /while\s*\(\s*true\s*\)/,
    /observe.*think.*plan.*act/i,
    /agent.*loop/i,
    /autonomous/i,
    /\.run\(\s*\).*while/,
];

// ─── Implementation ─────────────────────────────────────

export async function detectRuntime(projectPath: string): Promise<DetectionResult> {
    // 1. Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};

    if (await fs.pathExists(packageJsonPath)) {
        try {
            const pkg = await fs.readJson(packageJsonPath);
            dependencies = pkg.dependencies ?? {};
            devDependencies = pkg.devDependencies ?? {};
        } catch { /* invalid package.json */ }
    }

    const allDeps = { ...dependencies, ...devDependencies };
    const depNames = Object.keys(allDeps);

    // 2. Detect known frameworks
    let bestMatch: FrameworkSignature | null = null;
    for (const framework of KNOWN_FRAMEWORKS) {
        const matched = framework.packages.some(pkg => depNames.includes(pkg));
        if (matched) {
            // Higher level wins
            if (!bestMatch || levelRank(framework.level) > levelRank(bestMatch.level)) {
                bestMatch = framework;
            }
        }
    }

    // 3. Scan source files for code patterns
    const codeAnalysis = await scanSourceFiles(projectPath);

    // 4. Build result
    if (!bestMatch && depNames.length === 0) {
        // No package.json or empty — new project
        return {
            level: 'none',
            hasTools: false,
            hasMemory: false,
            hasLoop: false,
            hasScheduler: false,
            confidence: 0.95,
            description: 'No existing agent detected — fresh project',
            gsepMode: 'quickstart',
            detectedDependencies: [],
        };
    }

    if (!bestMatch) {
        // Has deps but no known AI framework
        const hasAnyAI = depNames.some(d =>
            d.includes('openai') || d.includes('anthropic') || d.includes('ai') ||
            d.includes('llm') || d.includes('gpt') || d.includes('claude'),
        );

        if (!hasAnyAI) {
            return {
                level: 'none',
                hasTools: false,
                hasMemory: false,
                hasLoop: false,
                hasScheduler: false,
                confidence: 0.8,
                description: 'No AI dependencies detected',
                gsepMode: 'quickstart',
                detectedDependencies: depNames.slice(0, 5),
            };
        }

        // Has AI deps but unknown framework
        return {
            level: 'chatbot',
            hasTools: codeAnalysis.hasTools,
            hasMemory: codeAnalysis.hasMemory,
            hasLoop: codeAnalysis.hasLoop,
            hasScheduler: false,
            confidence: 0.6,
            description: 'AI dependencies detected but no known framework',
            gsepMode: codeAnalysis.hasTools ? 'middleware' : 'quickstart-proactive',
            detectedDependencies: depNames.filter(d =>
                d.includes('openai') || d.includes('anthropic') || d.includes('ai'),
            ),
        };
    }

    // Known framework detected
    const hasTools = bestMatch.hasTools || codeAnalysis.hasTools;
    const hasMemory = bestMatch.hasMemory || codeAnalysis.hasMemory;
    const hasLoop = bestMatch.hasLoop || codeAnalysis.hasLoop;

    const level = hasLoop ? 'autonomous'
        : hasTools ? 'agent-with-tools'
        : 'chatbot';

    const gsepMode = level === 'autonomous' ? 'middleware-observer'
        : level === 'agent-with-tools' ? 'middleware'
        : 'quickstart-proactive';

    return {
        level,
        framework: bestMatch.name,
        provider: detectProvider(depNames),
        hasTools,
        hasMemory,
        hasLoop,
        hasScheduler: codeAnalysis.hasLoop,
        confidence: 0.9,
        description: `${bestMatch.name} detected (${level})`,
        gsepMode,
        detectedDependencies: bestMatch.packages.filter(p => depNames.includes(p)),
    };
}

/**
 * Format detection result for CLI display.
 */
export function formatDetectionResult(result: DetectionResult): string {
    const lines: string[] = [];

    const icon = result.level === 'autonomous' ? '🤖'
        : result.level === 'agent-with-tools' ? '🔧'
        : result.level === 'chatbot' ? '💬'
        : '📦';

    lines.push(`${icon} ${chalk.bold('Detected:')} ${result.description}`);

    if (result.framework) {
        lines.push(`   Framework: ${chalk.cyan(result.framework)}`);
    }
    if (result.provider) {
        lines.push(`   Provider: ${chalk.cyan(result.provider)}`);
    }

    lines.push(`   Tools: ${result.hasTools ? chalk.green('Yes') : chalk.gray('No')}`);
    lines.push(`   Memory: ${result.hasMemory ? chalk.green('Yes') : chalk.gray('No')}`);
    lines.push(`   Autonomous Loop: ${result.hasLoop ? chalk.green('Yes') : chalk.gray('No')}`);

    const modeDesc = {
        'quickstart': 'GSEP.quickStart() — full runtime, GSEP controls everything',
        'quickstart-proactive': 'GSEP.quickStart() — with proactive hooks for your chatbot',
        'middleware': 'GSEP.middleware() — two hooks (before/after) for your agent',
        'middleware-observer': 'GSEP.middleware() — observer mode for your autonomous agent',
    };

    lines.push(`\n   ${chalk.bold('Recommended mode:')} ${chalk.yellow(modeDesc[result.gsepMode])}`);
    lines.push(`   Confidence: ${chalk.cyan((result.confidence * 100).toFixed(0) + '%')}`);

    return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────

async function scanSourceFiles(projectPath: string): Promise<{
    hasTools: boolean;
    hasMemory: boolean;
    hasLoop: boolean;
}> {
    let hasTools = false;
    let hasMemory = false;
    let hasLoop = false;

    const srcDir = path.join(projectPath, 'src');
    const dirs = [srcDir, projectPath];

    for (const dir of dirs) {
        if (!(await fs.pathExists(dir))) continue;

        try {
            const files = await fs.readdir(dir);
            const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx'));

            for (const file of tsFiles.slice(0, 20)) { // Cap at 20 files to keep it fast
                try {
                    const content = await fs.readFile(path.join(dir, file), 'utf-8');

                    if (!hasTools && TOOL_PATTERNS.some(p => p.test(content))) hasTools = true;
                    if (!hasMemory && MEMORY_PATTERNS.some(p => p.test(content))) hasMemory = true;
                    if (!hasLoop && LOOP_PATTERNS.some(p => p.test(content))) hasLoop = true;

                    if (hasTools && hasMemory && hasLoop) break; // All found, stop scanning
                } catch { /* skip unreadable files */ }
            }
        } catch { /* skip unreadable dirs */ }

        if (hasTools && hasMemory && hasLoop) break;
    }

    return { hasTools, hasMemory, hasLoop };
}

function levelRank(level: AgentLevel): number {
    return { none: 0, chatbot: 1, 'agent-with-tools': 2, autonomous: 3 }[level];
}

function detectProvider(deps: string[]): string | undefined {
    if (deps.includes('@anthropic-ai/sdk') || deps.some(d => d.includes('anthropic'))) return 'anthropic';
    if (deps.includes('openai') || deps.some(d => d.includes('openai'))) return 'openai';
    if (deps.some(d => d.includes('google') || d.includes('gemini'))) return 'google';
    if (deps.includes('ollama')) return 'ollama';
    return undefined;
}
