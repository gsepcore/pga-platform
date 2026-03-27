/**
 * LLMProxy — OpenAI/Anthropic-compatible proxy with GSEP evolution
 *
 * Makes GSEP accessible to ANY platform (n8n, Retell AI, Voiceflow, etc.)
 * by mimicking the LLM provider's API. The platform doesn't know GSEP exists.
 *
 * Supported API formats:
 * - OpenAI: POST /v1/chat/completions (used by 90%+ of platforms)
 * - Anthropic: POST /v1/messages
 *
 * Flow:
 *   Platform → GSEP Proxy → enhance prompt → real LLM → evolve → respond
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-27
 */

import type { FastifyInstance } from 'fastify';
import { GSEP, GenomeInstance, InMemoryStorageAdapter } from '@gsep/core';
import type { LLMAdapter } from '@gsep/core';

// ─── Types ──────────────────────────────────────────────

export interface LLMProxyConfig {
    /** LLM adapter to forward requests to */
    llm: LLMAdapter;

    /** Storage adapter (default: InMemoryStorageAdapter) */
    storage?: import('@gsep/core').StorageAdapter;

    /** Agent name (default: 'gsep-proxy') */
    name?: string;

    /** Agent purpose for Purpose Lock */
    purpose?: string;

    /** Allowed topics */
    allowedTopics?: string[];

    /** Forbidden topics */
    forbiddenTopics?: string[];
}

// ─── OpenAI-Compatible Request/Response Types ───────────

interface OpenAIRequest {
    model?: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

interface OpenAIResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content: string;
        };
        finish_reason: 'stop';
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ─── Anthropic-Compatible Request/Response Types ────────

interface AnthropicRequest {
    model?: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    system?: string;
    max_tokens?: number;
    temperature?: number;
}

interface AnthropicResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{ type: 'text'; text: string }>;
    model: string;
    stop_reason: 'end_turn';
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

// ─── Implementation ─────────────────────────────────────

export class LLMProxy {
    private genome: GenomeInstance | null = null;
    private config: LLMProxyConfig;

    constructor(config: LLMProxyConfig) {
        this.config = config;
    }

    /**
     * Initialize the proxy — creates the GSEP genome.
     */
    async initialize(): Promise<void> {
        const gsep = new GSEP({
            llm: this.config.llm,
            storage: this.config.storage ?? new InMemoryStorageAdapter(),
        });
        await gsep.initialize();

        this.genome = await gsep.createGenome({
            name: this.config.name ?? 'gsep-proxy',
            config: {
                purposeLock: this.config.purpose ? {
                    enabled: true,
                    purpose: this.config.purpose,
                    allowedTopics: this.config.allowedTopics,
                    forbiddenTopics: this.config.forbiddenTopics,
                } : undefined,
            },
        });
    }

    /**
     * Register proxy routes on a Fastify instance.
     */
    registerRoutes(app: FastifyInstance): void {
        // ─── OpenAI-Compatible: POST /v1/chat/completions ───
        app.post('/v1/chat/completions', async (request, reply) => {
            const body = request.body as OpenAIRequest;

            if (!body.messages || !Array.isArray(body.messages)) {
                return reply.status(400).send({
                    error: { message: 'messages is required', type: 'invalid_request_error' },
                });
            }

            try {
                const result = await this.processChat(body.messages);

                // Streaming mode — SSE chunked delivery
                if (body.stream) {
                    const id = `chatcmpl-gsep-${Date.now()}`;
                    const created = Math.floor(Date.now() / 1000);
                    const model = body.model ?? this.config.llm.model;

                    reply.raw.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });

                    const words = result.content.split(/(\s+)/);
                    for (const word of words) {
                        reply.raw.write(`data: ${JSON.stringify({
                            id, object: 'chat.completion.chunk', created, model,
                            choices: [{ index: 0, delta: { content: word }, finish_reason: null }],
                        })}\n\n`);
                    }

                    reply.raw.write(`data: ${JSON.stringify({
                        id, object: 'chat.completion.chunk', created, model,
                        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                    })}\n\n`);
                    reply.raw.write('data: [DONE]\n\n');
                    reply.raw.end();
                    return;
                }

                // Non-streaming mode
                const response: OpenAIResponse = {
                    id: `chatcmpl-gsep-${Date.now()}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: body.model ?? this.config.llm.model,
                    choices: [{
                        index: 0,
                        message: { role: 'assistant', content: result.content },
                        finish_reason: 'stop',
                    }],
                    usage: {
                        prompt_tokens: result.promptTokens,
                        completion_tokens: result.completionTokens,
                        total_tokens: result.promptTokens + result.completionTokens,
                    },
                };

                return reply.send(response);
            } catch (err) {
                return reply.status(500).send({
                    error: {
                        message: err instanceof Error ? err.message : 'Internal error',
                        type: 'server_error',
                    },
                });
            }
        });

        // ─── Anthropic-Compatible: POST /v1/messages ────────
        app.post('/v1/messages', async (request, reply) => {
            const body = request.body as AnthropicRequest;

            if (!body.messages || !Array.isArray(body.messages)) {
                return reply.status(400).send({
                    error: { message: 'messages is required', type: 'invalid_request_error' },
                });
            }

            try {
                // Convert Anthropic format to internal format
                const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
                if (body.system) {
                    messages.push({ role: 'system', content: body.system });
                }
                messages.push(...body.messages);

                const result = await this.processChat(messages);

                const response: AnthropicResponse = {
                    id: `msg-gsep-${Date.now()}`,
                    type: 'message',
                    role: 'assistant',
                    content: [{ type: 'text', text: result.content }],
                    model: body.model ?? this.config.llm.model,
                    stop_reason: 'end_turn',
                    usage: {
                        input_tokens: result.promptTokens,
                        output_tokens: result.completionTokens,
                    },
                };

                return reply.send(response);
            } catch (err) {
                return reply.status(500).send({
                    error: {
                        message: err instanceof Error ? err.message : 'Internal error',
                        type: 'server_error',
                    },
                });
            }
        });

        // ─── Health check ───────────────────────────────────
        app.get('/v1/health', async (_request, reply) => {
            const report = this.genome?.generateWeeklyReport();
            return reply.send({
                status: 'ok',
                gsep: true,
                genome: this.genome ? {
                    interactions: report?.conversations.total ?? 0,
                    quality: report?.quality.endScore ?? 0,
                    trend: report?.quality.trend ?? 'unknown',
                } : null,
            });
        });

        // ─── Models list (OpenAI-compatible) ────────────────
        app.get('/v1/models', async (_request, reply) => {
            return reply.send({
                object: 'list',
                data: [{
                    id: this.config.llm.model,
                    object: 'model',
                    created: Math.floor(Date.now() / 1000),
                    owned_by: 'gsep-proxy',
                }],
            });
        });

        // ─── GSEP Dashboard / Report ────────────────────────
        app.get('/gsep/report', async (_request, reply) => {
            if (!this.genome) {
                return reply.status(503).send({ error: 'Genome not initialized' });
            }
            return reply.send(this.genome.generateWeeklyReport());
        });

        app.get('/gsep/anomalies', async (_request, reply) => {
            if (!this.genome) {
                return reply.status(503).send({ error: 'Genome not initialized' });
            }
            return reply.send({
                analytics: this.genome.getAnomalyAnalytics(),
                recent: this.genome.getAnomalyHistory(20),
            });
        });

        app.get('/gsep/skills', async (_request, reply) => {
            if (!this.genome) {
                return reply.status(503).send({ error: 'Genome not initialized' });
            }
            return reply.send(this.genome.getSkillRanking());
        });
    }

    // ─── Core Processing ────────────────────────────────────

    private async processChat(
        messages: Array<{ role: string; content: string }>,
    ): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
        if (!this.genome) {
            throw new Error('GSEP proxy not initialized');
        }

        // Extract user message
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMsg = userMessages[userMessages.length - 1]?.content ?? '';

        // Use GSEP chat flow — includes all 27 systems
        const response = await this.genome.chat(lastUserMsg, {
            userId: 'proxy-user',
            taskType: 'general',
        });

        // Estimate tokens (rough)
        const promptTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
        const completionTokens = Math.ceil(response.length / 4);

        return { content: response, promptTokens, completionTokens };
    }
}
