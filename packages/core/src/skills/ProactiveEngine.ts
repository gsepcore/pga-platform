/**
 * ProactiveEngine — Background autonomous agent loop
 *
 * Makes the agent act WITHOUT being asked. Runs on a configurable
 * schedule and uses skills to observe, analyze, and take action.
 *
 * This is what converts a reactive chatbot into a proactive agent:
 * - Monitors external data sources on schedule
 * - Detects changes and anomalies
 * - Executes skills autonomously
 * - Notifies the user when something important happens
 *
 * Examples:
 * - Check competitor prices every hour
 * - Monitor service status and adapt responses during outages
 * - Review conversation patterns weekly and suggest improvements
 * - Alert on unusual activity patterns
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import type { LLMAdapter, Message } from '../interfaces/LLMAdapter.js';
import type { SkillRegistry } from './SkillRegistry.js';
import type { SkillExecutor } from './SkillExecutor.js';

// ─── Types ──────────────────────────────────────────────

export interface ProactiveTask {
    /** Unique task ID */
    id: string;

    /** Human-readable name */
    name: string;

    /** What to do — natural language instruction for the LLM */
    instruction: string;

    /** Cron-like schedule: interval in ms, or 'once' */
    intervalMs: number | 'once';

    /** Skills this task is allowed to use (empty = all) */
    allowedSkills?: string[];

    /** Whether to notify the user when something is found */
    notify: boolean;

    /** Priority: higher priority tasks run first when multiple are due */
    priority: number;

    /** Whether this task is currently active */
    active: boolean;
}

export interface ProactiveResult {
    taskId: string;
    taskName: string;
    timestamp: Date;
    findings: string;
    actionTaken: string;
    skillsUsed: string[];
    shouldNotify: boolean;
    importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProactiveEngineConfig {
    /** Min interval between proactive cycles in ms (default: 60000 = 1 min) */
    minIntervalMs?: number;

    /** Max concurrent task executions (default: 2) */
    maxConcurrent?: number;

    /** Purpose statement for context in LLM calls */
    agentPurpose?: string;
}

export type NotificationHandler = (result: ProactiveResult) => void | Promise<void>;

// ─── Implementation ─────────────────────────────────────

export class ProactiveEngine {
    private config: Required<ProactiveEngineConfig>;
    private tasks: Map<string, ProactiveTask> = new Map();
    private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
    private results: ProactiveResult[] = [];
    private notificationHandlers: NotificationHandler[] = [];
    private running = false;

    constructor(
        private llm: LLMAdapter,
        private registry: SkillRegistry,
        private executor: SkillExecutor,
        config: ProactiveEngineConfig = {},
    ) {
        this.config = {
            minIntervalMs: config.minIntervalMs ?? 60000,
            maxConcurrent: config.maxConcurrent ?? 2,
            agentPurpose: config.agentPurpose ?? 'AI assistant',
        };
    }

    /**
     * Register a proactive task.
     */
    addTask(task: Omit<ProactiveTask, 'active'>): void {
        this.tasks.set(task.id, { ...task, active: true });
    }

    /**
     * Remove a proactive task.
     */
    removeTask(id: string): void {
        this.stopTask(id);
        this.tasks.delete(id);
    }

    /**
     * Register a notification handler (called when a task has findings).
     */
    onNotification(handler: NotificationHandler): void {
        this.notificationHandlers.push(handler);
    }

    /**
     * Start the proactive engine — begins running scheduled tasks.
     */
    start(): void {
        if (this.running) return;
        this.running = true;

        for (const [id, task] of this.tasks) {
            if (task.active) {
                this.scheduleTask(id, task);
            }
        }
    }

    /**
     * Stop the proactive engine — pauses all tasks.
     */
    stop(): void {
        this.running = false;
        for (const [id] of this.timers) {
            this.stopTask(id);
        }
    }

    /**
     * Run a specific task immediately (regardless of schedule).
     */
    async runTask(id: string): Promise<ProactiveResult | null> {
        const task = this.tasks.get(id);
        if (!task) return null;

        return this.executeTask(task);
    }

    /**
     * Run all active tasks once (useful for testing or manual triggers).
     */
    async runAll(): Promise<ProactiveResult[]> {
        const activeTasks = Array.from(this.tasks.values())
            .filter(t => t.active)
            .sort((a, b) => b.priority - a.priority);

        const results: ProactiveResult[] = [];
        for (const task of activeTasks) {
            const result = await this.executeTask(task);
            results.push(result);
        }
        return results;
    }

    /**
     * Get all results history.
     */
    getResults(limit: number = 50): ProactiveResult[] {
        return this.results.slice(-limit);
    }

    /**
     * Get all registered tasks.
     */
    getTasks(): ProactiveTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Check if the engine is running.
     */
    isRunning(): boolean {
        return this.running;
    }

    // ─── Task Execution ─────────────────────────────────────

    private async executeTask(task: ProactiveTask): Promise<ProactiveResult> {
        const availableSkills = task.allowedSkills
            ? this.registry.list().filter(s => task.allowedSkills!.includes(s.name))
            : this.registry.list();

        const skillDescriptions = availableSkills.length > 0
            ? availableSkills.map(s => `- ${s.name}: ${s.description}`).join('\n')
            : 'No skills available.';

        const messages: Message[] = [
            {
                role: 'system',
                content: `You are a proactive AI agent. Your purpose: ${this.config.agentPurpose}.

You are running a background task autonomously — no user is talking to you right now.
Your job is to execute the task, analyze the results, and report findings.

Available skills you can use:
${skillDescriptions}

To use a skill, include a <tool_call> block:
<tool_call>
{"name": "skill_name", "arguments": {"param": "value"}}
</tool_call>

After analyzing, respond with a JSON summary:
{"findings": "what you found", "actionTaken": "what you did", "skillsUsed": ["skill1"], "importance": "low|medium|high|critical"}`,
            },
            {
                role: 'user',
                content: `Execute this proactive task:\n\n**${task.name}**\n${task.instruction}`,
            },
        ];

        try {
            const response = await this.llm.chat(messages);
            const content = response.content;

            // Execute any tool calls in the response
            const toolCallPattern = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
            const skillsUsed: string[] = [];
            let match;

            while ((match = toolCallPattern.exec(content)) !== null) {
                try {
                    const parsed = JSON.parse(match[1].trim());
                    if (parsed.name && this.registry.has(parsed.name)) {
                        await this.executor.execute(parsed.name, parsed.arguments ?? {});
                        skillsUsed.push(parsed.name);
                    }
                } catch { /* skip malformed */ }
            }

            // Parse the JSON summary
            const jsonMatch = content.match(/\{[\s\S]*"findings"[\s\S]*\}/);
            let findings = 'Task completed';
            let actionTaken = 'Analyzed';
            let importance: ProactiveResult['importance'] = 'low';

            if (jsonMatch) {
                try {
                    const summary = JSON.parse(jsonMatch[0]);
                    findings = summary.findings ?? findings;
                    actionTaken = summary.actionTaken ?? actionTaken;
                    importance = summary.importance ?? importance;
                    if (Array.isArray(summary.skillsUsed)) {
                        skillsUsed.push(...summary.skillsUsed.filter((s: string) => !skillsUsed.includes(s)));
                    }
                } catch { /* use defaults */ }
            }

            const result: ProactiveResult = {
                taskId: task.id,
                taskName: task.name,
                timestamp: new Date(),
                findings,
                actionTaken,
                skillsUsed,
                shouldNotify: task.notify && importance !== 'low',
                importance,
            };

            this.results.push(result);
            if (this.results.length > 200) {
                this.results = this.results.slice(-200);
            }

            // Notify if needed
            if (result.shouldNotify) {
                for (const handler of this.notificationHandlers) {
                    try {
                        await handler(result);
                    } catch { /* don't let handler errors crash the engine */ }
                }
            }

            return result;

        } catch (err) {
            const result: ProactiveResult = {
                taskId: task.id,
                taskName: task.name,
                timestamp: new Date(),
                findings: `Task failed: ${err instanceof Error ? err.message : String(err)}`,
                actionTaken: 'None — execution error',
                skillsUsed: [],
                shouldNotify: false,
                importance: 'low',
            };
            this.results.push(result);
            return result;
        }
    }

    // ─── Scheduling ─────────────────────────────────────────

    private scheduleTask(id: string, task: ProactiveTask): void {
        if (task.intervalMs === 'once') {
            // Run once then deactivate
            setTimeout(async () => {
                await this.executeTask(task);
                task.active = false;
            }, 0);
            return;
        }

        const interval = Math.max(task.intervalMs, this.config.minIntervalMs);
        const timer = setInterval(async () => {
            if (!this.running || !task.active) {
                this.stopTask(id);
                return;
            }
            await this.executeTask(task);
        }, interval);

        this.timers.set(id, timer);
    }

    private stopTask(id: string): void {
        const timer = this.timers.get(id);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(id);
        }
    }
}
