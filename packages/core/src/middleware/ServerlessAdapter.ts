/**
 * ServerlessAdapter — GSEP for ephemeral environments
 *
 * Adapts GSEP for serverless (Lambda, Vercel, Cloudflare Workers) where:
 * - Process dies after each request (no persistent memory)
 * - No background timers (no ProactiveEngine)
 * - Cold starts need to be fast
 *
 * Solution: uses external storage (Postgres/Redis) and lazy initialization.
 * ProactiveEngine is disabled — use external cron (CloudWatch, Vercel Cron)
 * to trigger evolution cycles.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-27
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';
import { GSEP, GenomeInstance } from '../GSEP.js';
import { getPreset, type PresetName } from '../presets/ConfigPresets.js';

// ─── Types ──────────────────────────────────────────────

export interface ServerlessConfig {
    /** LLM adapter (required — no auto-detect in serverless for speed) */
    llm: LLMAdapter;

    /** Persistent storage (required — InMemory loses state between invocations) */
    storage: StorageAdapter;

    /** Genome name */
    name?: string;

    /** Configuration preset (default: 'conscious' — full is too heavy for cold starts) */
    preset?: PresetName;

    /** Autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;

    /** Agent purpose */
    purpose?: string;

    /** Allowed topics */
    allowedTopics?: string[];

    /** Forbidden topics */
    forbiddenTopics?: string[];
}

// ─── Singleton Cache ────────────────────────────────────

let cachedGenome: GenomeInstance | null = null;
let cachedGenomeName: string | null = null;

// ─── Implementation ─────────────────────────────────────

/**
 * Get or create a GSEP genome for serverless environments.
 *
 * Uses a module-level singleton to survive across warm invocations
 * (Lambda keeps the process alive between requests in warm state).
 * On cold start, reinitializes from persistent storage.
 *
 * @example Lambda handler:
 * ```typescript
 * import { serverlessChat } from '@gsep/core';
 * import { PostgresAdapter } from '@gsep/adapters-storage-postgres';
 * import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
 *
 * const config = {
 *   llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
 *   storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
 *   name: 'my-lambda-agent',
 *   purpose: 'Customer support',
 * };
 *
 * export const handler = async (event) => {
 *   const response = await serverlessChat(config, event.body.message, {
 *     userId: event.body.userId,
 *   });
 *   return { statusCode: 200, body: JSON.stringify({ response }) };
 * };
 * ```
 */
export async function getServerlessGenome(config: ServerlessConfig): Promise<GenomeInstance> {
    const genomeName = config.name ?? 'serverless-agent';

    // Return cached genome if same name (warm invocation)
    if (cachedGenome && cachedGenomeName === genomeName) {
        return cachedGenome;
    }

    // Build config — disable features that need persistent process
    const preset = config.preset ?? 'conscious'; // Not 'full' — skip swarm/genesis for speed
    const autonomous: AutonomousConfig = {
        ...getPreset(preset),
        // Disable features that need background process
        continuousEvolution: false, // Use external cron instead
        enableAutonomousLoop: false, // No persistent loop in serverless
        enableCuriosityEngine: false, // Needs accumulation across requests
        ...config.overrides,
    };

    const gsep = new GSEP({
        llm: config.llm,
        storage: config.storage,
    });
    await gsep.initialize();

    // Try to load existing genome first (persistent storage)
    const genomes = await gsep.listGenomes();
    const existing = genomes.find(g => g.name === genomeName);

    if (existing) {
        const loaded = await gsep.loadGenome(existing.id);
        if (loaded) {
            cachedGenome = loaded;
            cachedGenomeName = genomeName;
            return loaded;
        }
    }

    // Create new genome
    cachedGenome = await gsep.createGenome({
        name: genomeName,
        config: {
            autonomous,
            purposeLock: config.purpose ? {
                enabled: true,
                purpose: config.purpose,
                allowedTopics: config.allowedTopics,
                forbiddenTopics: config.forbiddenTopics,
            } : undefined,
        },
    });
    cachedGenomeName = genomeName;

    return cachedGenome;
}

/**
 * One-call serverless chat — handles genome lifecycle automatically.
 */
export async function serverlessChat(
    config: ServerlessConfig,
    message: string,
    context: { userId?: string; taskType?: string } = {},
): Promise<string> {
    const genome = await getServerlessGenome(config);
    return genome.chat(message, {
        userId: context.userId ?? 'anonymous',
        taskType: context.taskType ?? 'general',
    });
}

/**
 * Trigger an evolution cycle in serverless (call from external cron).
 *
 * @example CloudWatch cron → Lambda:
 * ```typescript
 * export const evolveHandler = async () => {
 *   await serverlessEvolve(config);
 *   return { statusCode: 200 };
 * };
 * ```
 */
export async function serverlessEvolve(config: ServerlessConfig): Promise<void> {
    const genome = await getServerlessGenome({
        ...config,
        overrides: {
            ...config.overrides,
            continuousEvolution: true, // Enable for this invocation
            evolveEveryN: 1, // Force evolution now
        },
    });

    // Trigger a dummy interaction to force evolution cycle
    try {
        await genome.chat('__gsep_evolution_trigger__', {
            userId: 'system',
            taskType: 'evolution',
        });
    } catch {
        // Evolution may fail if no interactions — that's ok
    }
}

/**
 * Clear the cached genome (useful for testing or forced reinitialization).
 */
export function clearServerlessCache(): void {
    cachedGenome = null;
    cachedGenomeName = null;
}
