/**
 * SkillRouter — Decides when and which skills to use
 *
 * This is what makes GSEP unique: not just having skills (commodity),
 * but evolving HOW and WHEN to use them. The router learns from
 * execution history and adapts skill selection over time.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import type { LLMAdapter, Message } from '../interfaces/LLMAdapter.js';
import type { SkillRegistry, SkillCallResult } from './SkillRegistry.js';
import type { SkillExecutor } from './SkillExecutor.js';

// ─── Types ──────────────────────────────────────────────

export interface ToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolCallResult {
    call: ToolCall;
    result: SkillCallResult;
}

export interface SkillRouterConfig {
    /** Max tool calls per chat turn (default: 5) */
    maxToolCalls?: number;

    /** Max iterations of the tool-calling loop (default: 3) */
    maxIterations?: number;
}

// ─── Implementation ─────────────────────────────────────

export class SkillRouter {
    private config: Required<SkillRouterConfig>;

    constructor(
        private registry: SkillRegistry,
        private executor: SkillExecutor,
        private llm: LLMAdapter,
        config: SkillRouterConfig = {},
    ) {
        this.config = {
            maxToolCalls: config.maxToolCalls ?? 5,
            maxIterations: config.maxIterations ?? 3,
        };
    }

    /**
     * Run the tool-calling loop.
     *
     * Given a system prompt and user message, lets the LLM decide which
     * tools to call, executes them, feeds results back, and repeats
     * until the LLM produces a final text response (no more tool calls).
     *
     * Returns the final response text and all tool calls made.
     */
    async run(systemPrompt: string, userMessage: string): Promise<{
        response: string;
        toolCalls: ToolCallResult[];
    }> {
        const toolDefs = this.registry.buildToolDefinitions();
        const allToolCalls: ToolCallResult[] = [];

        // If no skills registered, skip tool calling entirely
        if (toolDefs.length === 0) {
            const response = await this.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ]);
            return { response: response.content, toolCalls: [] };
        }

        // Build conversation with tool definitions
        const messages: Message[] = [
            { role: 'system', content: this.buildSystemWithTools(systemPrompt, toolDefs) },
            { role: 'user', content: userMessage },
        ];

        let totalCalls = 0;

        for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
            const response = await this.llm.chat(messages);

            // Check if the LLM wants to call tools
            const toolCalls = this.extractToolCalls(response.content);

            if (toolCalls.length === 0) {
                // No tool calls — final response
                return {
                    response: this.cleanResponse(response.content),
                    toolCalls: allToolCalls,
                };
            }

            // Execute tool calls (respect max limit)
            const callsToMake = toolCalls.slice(0, this.config.maxToolCalls - totalCalls);

            const results: string[] = [];
            for (const call of callsToMake) {
                const result = await this.executor.execute(call.name, call.arguments);
                allToolCalls.push({ call, result });
                totalCalls++;

                results.push(
                    `<tool_result name="${call.name}">\n${result.success ? result.output : `ERROR: ${result.error}`}\n</tool_result>`,
                );

                if (totalCalls >= this.config.maxToolCalls) break;
            }

            // Feed results back to LLM
            messages.push({ role: 'assistant', content: response.content });
            messages.push({ role: 'user', content: results.join('\n\n') });

            if (totalCalls >= this.config.maxToolCalls) {
                // Force final response
                messages.push({
                    role: 'user',
                    content: 'You have reached the tool call limit. Please provide your final response now.',
                });
            }
        }

        // Max iterations reached — get whatever the LLM has
        const finalResponse = await this.llm.chat(messages);
        return {
            response: this.cleanResponse(finalResponse.content),
            toolCalls: allToolCalls,
        };
    }

    // ─── Prompt Building ────────────────────────────────────

    private buildSystemWithTools(
        systemPrompt: string,
        tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
    ): string {
        const toolDescriptions = tools.map(t => {
            const params = t.input_schema.properties
                ? Object.entries(t.input_schema.properties as Record<string, { type?: string; description?: string }>)
                    .map(([k, v]) => `  - ${k}: ${v.description ?? v.type ?? 'any'}`)
                    .join('\n')
                : '  (no parameters)';

            return `### ${t.name}\n${t.description}\nParameters:\n${params}`;
        }).join('\n\n');

        return `${systemPrompt}

---

## Available Tools

You have access to the following tools. To use a tool, include a <tool_call> block in your response:

<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1"}}
</tool_call>

You can call multiple tools in one response. After receiving tool results, incorporate them into your final answer.

${toolDescriptions}`;
    }

    // ─── Tool Call Extraction ───────────────────────────────

    private extractToolCalls(content: string): ToolCall[] {
        const calls: ToolCall[] = [];
        const pattern = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

        let match;
        while ((match = pattern.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(match[1].trim());
                if (parsed.name && typeof parsed.name === 'string') {
                    // Only call tools that exist in registry
                    if (this.registry.has(parsed.name)) {
                        calls.push({
                            name: parsed.name,
                            arguments: parsed.arguments ?? {},
                        });
                    }
                }
            } catch { /* skip malformed tool calls */ }
        }

        return calls;
    }

    // ─── Helpers ────────────────────────────────────────────

    private cleanResponse(content: string): string {
        // Remove any leftover tool_call blocks from the final response
        return content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
    }
}
