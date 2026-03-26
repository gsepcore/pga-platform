/**
 * SkillRegistry — Manages available tools/skills for the agent
 *
 * Skills are tools the agent can use: web search, browse, file I/O, etc.
 * They can come from MCP servers, direct adapters, or inline functions.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

// ─── Types ──────────────────────────────────────────────

export interface SkillDefinition {
    /** Unique skill name (e.g. 'web-search', 'github-read') */
    name: string;

    /** Human-readable description (injected into LLM prompt) */
    description: string;

    /** JSON Schema for the skill's input parameters */
    inputSchema: Record<string, unknown>;

    /** Source type */
    source: 'mcp' | 'inline' | 'adapter';

    /** MCP server URI (only for source='mcp') */
    mcpUri?: string;

    /** Inline execution function (only for source='inline') */
    execute?: (params: Record<string, unknown>) => Promise<string>;

    /** Fitness metrics for this skill */
    metrics: SkillMetrics;
}

export interface SkillMetrics {
    totalCalls: number;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    successRate: number;
    lastUsed: Date | null;
}

export interface SkillCallResult {
    success: boolean;
    output: string;
    latencyMs: number;
    error?: string;
}

// ─── Implementation ─────────────────────────────────────

export class SkillRegistry {
    private skills: Map<string, SkillDefinition> = new Map();

    /**
     * Register a skill from an inline function.
     */
    registerInline(
        name: string,
        description: string,
        inputSchema: Record<string, unknown>,
        execute: (params: Record<string, unknown>) => Promise<string>,
    ): void {
        this.skills.set(name, {
            name,
            description,
            inputSchema,
            source: 'inline',
            execute,
            metrics: this.emptyMetrics(),
        });
    }

    /**
     * Register a skill from an MCP server URI.
     * The actual tool definitions will be fetched when connecting.
     */
    registerMCP(name: string, description: string, mcpUri: string, inputSchema: Record<string, unknown> = {}): void {
        this.skills.set(name, {
            name,
            description,
            inputSchema,
            source: 'mcp',
            mcpUri,
            metrics: this.emptyMetrics(),
        });
    }

    /**
     * Register multiple skills from an MCP server's tool list.
     */
    registerMCPTools(tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>, mcpUri: string): void {
        for (const tool of tools) {
            this.skills.set(tool.name, {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                source: 'mcp',
                mcpUri,
                metrics: this.emptyMetrics(),
            });
        }
    }

    /**
     * Get a skill by name.
     */
    get(name: string): SkillDefinition | undefined {
        return this.skills.get(name);
    }

    /**
     * List all registered skills.
     */
    list(): SkillDefinition[] {
        return Array.from(this.skills.values());
    }

    /**
     * Get skill count.
     */
    get size(): number {
        return this.skills.size;
    }

    /**
     * Check if a skill exists.
     */
    has(name: string): boolean {
        return this.skills.has(name);
    }

    /**
     * Remove a skill.
     */
    remove(name: string): boolean {
        return this.skills.delete(name);
    }

    /**
     * Record a skill execution result for fitness tracking.
     */
    recordExecution(name: string, result: SkillCallResult): void {
        const skill = this.skills.get(name);
        if (!skill) return;

        skill.metrics.totalCalls++;
        if (result.success) {
            skill.metrics.successCount++;
        } else {
            skill.metrics.failureCount++;
        }
        skill.metrics.successRate = skill.metrics.totalCalls > 0
            ? skill.metrics.successCount / skill.metrics.totalCalls
            : 0;
        skill.metrics.avgLatencyMs = skill.metrics.totalCalls > 1
            ? (skill.metrics.avgLatencyMs * (skill.metrics.totalCalls - 1) + result.latencyMs) / skill.metrics.totalCalls
            : result.latencyMs;
        skill.metrics.lastUsed = new Date();
    }

    /**
     * Build tool definitions for LLM prompt injection.
     * Returns the format expected by Claude/OpenAI tool calling.
     */
    buildToolDefinitions(): Array<{
        name: string;
        description: string;
        input_schema: Record<string, unknown>;
    }> {
        return this.list().map(skill => ({
            name: skill.name,
            description: `${skill.description}${skill.metrics.totalCalls > 5
                ? ` (success rate: ${(skill.metrics.successRate * 100).toFixed(0)}%)`
                : ''}`,
            input_schema: skill.inputSchema,
        }));
    }

    /**
     * Get skills ranked by fitness (for evolution insights).
     */
    getRankedSkills(): SkillDefinition[] {
        return this.list()
            .filter(s => s.metrics.totalCalls > 0)
            .sort((a, b) => b.metrics.successRate - a.metrics.successRate);
    }

    private emptyMetrics(): SkillMetrics {
        return {
            totalCalls: 0,
            successCount: 0,
            failureCount: 0,
            avgLatencyMs: 0,
            successRate: 0,
            lastUsed: null,
        };
    }
}
