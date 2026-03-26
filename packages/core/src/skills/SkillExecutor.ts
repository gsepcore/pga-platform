/**
 * SkillExecutor — Executes skills via MCP or inline functions
 *
 * Handles the actual execution of tool calls, MCP server communication,
 * timeout management, and error handling.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { SkillRegistry, SkillCallResult } from './SkillRegistry.js';

// ─── Types ──────────────────────────────────────────────

export interface SkillExecutorConfig {
    /** Timeout per skill call in ms (default: 30000) */
    timeoutMs?: number;

    /** Max retries on failure (default: 1) */
    maxRetries?: number;
}

// ─── Implementation ─────────────────────────────────────

export class SkillExecutor {
    private config: Required<SkillExecutorConfig>;
    private mcpClients: Map<string, Client> = new Map();

    constructor(
        private registry: SkillRegistry,
        config: SkillExecutorConfig = {},
    ) {
        this.config = {
            timeoutMs: config.timeoutMs ?? 30000,
            maxRetries: config.maxRetries ?? 1,
        };
    }

    /**
     * Execute a skill by name with given parameters.
     */
    async execute(skillName: string, params: Record<string, unknown>): Promise<SkillCallResult> {
        const skill = this.registry.get(skillName);
        if (!skill) {
            return {
                success: false,
                output: '',
                latencyMs: 0,
                error: `Skill "${skillName}" not found`,
            };
        }

        const start = Date.now();
        let lastError: string | undefined;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                let output: string;

                if (skill.source === 'inline' && skill.execute) {
                    output = await this.executeWithTimeout(
                        skill.execute(params),
                        this.config.timeoutMs,
                    );
                } else if (skill.source === 'mcp' && skill.mcpUri) {
                    output = await this.executeMCP(skill.mcpUri, skillName, params);
                } else {
                    throw new Error(`Skill "${skillName}" has no execution handler`);
                }

                const result: SkillCallResult = {
                    success: true,
                    output,
                    latencyMs: Date.now() - start,
                };
                this.registry.recordExecution(skillName, result);
                return result;

            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                if (attempt < this.config.maxRetries) {
                    // Wait before retry (exponential backoff)
                    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                }
            }
        }

        const result: SkillCallResult = {
            success: false,
            output: '',
            latencyMs: Date.now() - start,
            error: lastError,
        };
        this.registry.recordExecution(skillName, result);
        return result;
    }

    /**
     * Connect to an MCP server and discover its tools.
     */
    async connectMCP(uri: string): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> {
        try {
            const client = new Client({ name: 'gsep', version: '0.8.0' }, { capabilities: {} });

            // Try StreamableHTTP first, fall back to SSE
            let transport;
            try {
                transport = new StreamableHTTPClientTransport(new URL(uri));
                await client.connect(transport);
            } catch {
                transport = new SSEClientTransport(new URL(uri));
                await client.connect(transport);
            }

            this.mcpClients.set(uri, client);

            // List available tools
            const toolsResponse = await client.listTools();
            const tools = (toolsResponse.tools ?? []).map(tool => ({
                name: tool.name,
                description: tool.description ?? '',
                inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
            }));

            // Auto-register discovered tools
            this.registry.registerMCPTools(tools, uri);

            return tools;
        } catch (err) {
            throw new Error(`Failed to connect to MCP server at ${uri}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /**
     * Disconnect from all MCP servers.
     */
    async disconnect(): Promise<void> {
        for (const [, client] of this.mcpClients) {
            try {
                await client.close();
            } catch { /* ignore */ }
        }
        this.mcpClients.clear();
    }

    // ─── MCP Execution ──────────────────────────────────────

    private async executeMCP(uri: string, toolName: string, params: Record<string, unknown>): Promise<string> {
        let client = this.mcpClients.get(uri);

        // Auto-connect if not connected
        if (!client) {
            await this.connectMCP(uri);
            client = this.mcpClients.get(uri);
        }

        if (!client) {
            throw new Error(`Cannot connect to MCP server at ${uri}`);
        }

        const result = await this.executeWithTimeout(
            client.callTool({ name: toolName, arguments: params }),
            this.config.timeoutMs,
        );

        // Extract text content from MCP response
        if (typeof result === 'string') return result;
        if (result && typeof result === 'object') {
            const content = (result as Record<string, unknown>).content;
            if (Array.isArray(content)) {
                return content
                    .filter((c: Record<string, unknown>) => c.type === 'text')
                    .map((c: Record<string, unknown>) => c.text)
                    .join('\n');
            }
            if (typeof content === 'string') return content;
            return JSON.stringify(result);
        }

        return String(result);
    }

    // ─── Helpers ────────────────────────────────────────────

    private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Skill execution timed out after ${timeoutMs}ms`)), timeoutMs),
            ),
        ]);
    }
}
