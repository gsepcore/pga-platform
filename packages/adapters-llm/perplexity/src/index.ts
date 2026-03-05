/**
 * Perplexity Adapter for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Uses OpenAI-compatible API with Perplexity's base URL.
 * Includes web search capabilities via Perplexity's Sonar models.
 *
 * Supports:
 * - Sonar Pro (best quality)
 * - Sonar (fast)
 * - Streaming responses
 *
 * @example
 * ```typescript
 * import { PerplexityAdapter } from '@pga-ai/adapters-llm-perplexity';
 *
 * const adapter = new PerplexityAdapter({
 *   apiKey: process.env.PERPLEXITY_API_KEY,
 *   model: 'sonar-pro',
 * });
 * ```
 */

import OpenAI from 'openai';
import type {
    LLMAdapter,
    Message,
    ChatOptions,
    ChatResponse,
    ChatChunk,
} from '@pga-ai/core';

export interface PerplexityAdapterConfig {
    /**
     * Perplexity API key
     */
    apiKey: string;

    /**
     * Model to use
     * @default 'sonar-pro'
     */
    model?: string;

    /**
     * Default temperature (0-2)
     * @default 0.7
     */
    temperature?: number;

    /**
     * Search recency filter
     * @example 'month', 'week', 'day', 'hour'
     */
    searchRecency?: string;
}

export class PerplexityAdapter implements LLMAdapter {
    readonly name = 'perplexity';
    readonly model: string;

    private client: OpenAI;
    private config: PerplexityAdapterConfig;

    constructor(config: PerplexityAdapterConfig) {
        this.config = config;
        this.model = config.model || 'sonar-pro';

        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: 'https://api.perplexity.ai',
        });
    }

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        const openaiMessages = messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
        }));

        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: openaiMessages,
                temperature: options?.temperature ?? this.config.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 4096,
                stream: false,
            });

            const choice = response.choices[0];
            if (!choice) {
                throw new Error('No response from Perplexity');
            }

            return {
                content: choice.message.content || '',
                usage: {
                    inputTokens: response.usage?.prompt_tokens ?? 0,
                    outputTokens: response.usage?.completion_tokens ?? 0,
                },
                metadata: {
                    model: this.model,
                    finishReason: choice.finish_reason || 'stop',
                    citations: (response as unknown as Record<string, unknown>).citations ?? [],
                },
            };
        } catch (error) {
            throw new Error(
                `Perplexity API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async *stream(messages: Message[], options?: ChatOptions): AsyncIterableIterator<ChatChunk> {
        const openaiMessages = messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
        }));

        try {
            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: openaiMessages,
                temperature: options?.temperature ?? this.config.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 4096,
                stream: true,
            });

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta?.content) {
                    if (chunk.choices[0]?.finish_reason) {
                        yield { delta: '', done: true };
                    }
                    continue;
                }

                yield { delta: delta.content, done: false };
            }
        } catch (error) {
            throw new Error(
                `Perplexity streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async estimateCost(messages: Message[]): Promise<number> {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);

        // Sonar Pro pricing:
        // Input: $3 / million tokens
        // Output: $15 / million tokens
        const inputCost = (estimatedTokens * 0.7 * 3) / 1_000_000;
        const outputCost = (estimatedTokens * 0.3 * 15) / 1_000_000;

        return inputCost + outputCost;
    }
}
