/**
 * Ollama Adapter for GSEP
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Connects GSEP to local LLMs running via Ollama.
 * No external SDK needed — uses native fetch.
 *
 * Supports:
 * - Llama 3, Mistral, DeepSeek, Phi, Qwen, and any Ollama model
 * - Streaming responses
 * - Custom base URLs
 *
 * @example
 * ```typescript
 * import { OllamaAdapter } from '@gsep/adapters-llm-ollama';
 *
 * const adapter = new OllamaAdapter({
 *   model: 'llama3',
 *   // baseURL: 'http://localhost:11434', // default
 * });
 * ```
 */

import type {
    LLMAdapter,
    Message,
    ChatOptions,
    ChatResponse,
    ChatChunk,
} from '@gsep/core';

export interface OllamaAdapterConfig {
    /**
     * Ollama server URL
     * @default 'http://localhost:11434'
     */
    baseURL?: string;

    /**
     * Model to use (must be pulled in Ollama first)
     * @example 'llama3', 'mistral', 'deepseek-r1', 'phi3', 'qwen2'
     */
    model: string;

    /**
     * Default temperature (0-2)
     * @default 0.7
     */
    temperature?: number;

    /**
     * Request timeout in milliseconds
     * @default 120000
     */
    timeout?: number;
}

interface OllamaChatResponse {
    message: { role: string; content: string };
    done: boolean;
    total_duration?: number;
    eval_count?: number;
    prompt_eval_count?: number;
}

export class OllamaAdapter implements LLMAdapter {
    readonly name = 'ollama';
    readonly model: string;

    private baseURL: string;
    private config: Required<OllamaAdapterConfig>;

    constructor(config: OllamaAdapterConfig) {
        this.config = {
            baseURL: config.baseURL || 'http://localhost:11434',
            model: config.model,
            temperature: config.temperature ?? 0.7,
            timeout: config.timeout ?? 120000,
        };

        this.model = this.config.model;
        this.baseURL = this.config.baseURL;
    }

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        const ollamaMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        try {
            const response = await fetch(`${this.baseURL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: ollamaMessages,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? this.config.temperature,
                        num_predict: options?.maxTokens ?? 4096,
                    },
                }),
                signal: AbortSignal.timeout(this.config.timeout),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json() as OllamaChatResponse;

            return {
                content: data.message.content,
                usage: {
                    inputTokens: data.prompt_eval_count ?? 0,
                    outputTokens: data.eval_count ?? 0,
                },
                metadata: {
                    model: this.model,
                    totalDuration: data.total_duration,
                },
            };
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(
                    `Ollama connection failed at ${this.baseURL}. Is Ollama running? (ollama serve)`,
                );
            }
            throw new Error(
                `Ollama API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async *stream(messages: Message[], options?: ChatOptions): AsyncIterableIterator<ChatChunk> {
        const ollamaMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        try {
            const response = await fetch(`${this.baseURL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: ollamaMessages,
                    stream: true,
                    options: {
                        temperature: options?.temperature ?? this.config.temperature,
                        num_predict: options?.maxTokens ?? 4096,
                    },
                }),
                signal: AbortSignal.timeout(this.config.timeout),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            if (!response.body) {
                throw new Error('No response body for streaming');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const chunk = JSON.parse(line) as OllamaChatResponse;

                    if (chunk.done) {
                        yield { delta: '', done: true };
                        return;
                    }

                    if (chunk.message.content) {
                        yield { delta: chunk.message.content, done: false };
                    }
                }
            }

            yield { delta: '', done: true };
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(
                    `Ollama connection failed at ${this.baseURL}. Is Ollama running? (ollama serve)`,
                );
            }
            throw new Error(
                `Ollama streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
