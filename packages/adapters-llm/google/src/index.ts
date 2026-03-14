/**
 * Google Gemini Adapter for GSEP
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Supports:
 * - Gemini 2.0 Flash
 * - Gemini 1.5 Pro
 * - Gemini 1.5 Flash
 * - Streaming responses
 *
 * @example
 * ```typescript
 * import { GeminiAdapter } from '@pga-ai/adapters-llm-google';
 *
 * const adapter = new GeminiAdapter({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   model: 'gemini-2.0-flash',
 * });
 * ```
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    LLMAdapter,
    Message,
    ChatOptions,
    ChatResponse,
    ChatChunk,
} from '@pga-ai/core';

export interface GeminiAdapterConfig {
    /**
     * Google AI API key
     */
    apiKey: string;

    /**
     * Model to use
     * @default 'gemini-2.0-flash'
     */
    model?: string;

    /**
     * Default temperature (0-2)
     * @default 0.7
     */
    temperature?: number;

    /**
     * Max retries on failure
     * @default 2
     */
    maxRetries?: number;
}

export class GeminiAdapter implements LLMAdapter {
    readonly name = 'google';
    readonly model: string;

    private client: GoogleGenerativeAI;
    private config: Required<GeminiAdapterConfig>;

    constructor(config: GeminiAdapterConfig) {
        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'gemini-2.0-flash',
            temperature: config.temperature ?? 0.7,
            maxRetries: config.maxRetries ?? 2,
        };

        this.model = this.config.model;
        this.client = new GoogleGenerativeAI(this.config.apiKey);
    }

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');
        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

        const model = this.client.getGenerativeModel({
            model: this.model,
            systemInstruction: systemPrompt || undefined,
        });

        const geminiMessages = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' as const : 'user' as const,
            parts: [{ text: m.content }],
        }));

        try {
            const chat = model.startChat({
                history: geminiMessages.slice(0, -1),
                generationConfig: {
                    maxOutputTokens: options?.maxTokens ?? 4096,
                    temperature: options?.temperature ?? this.config.temperature,
                },
            });

            const lastMessage = geminiMessages[geminiMessages.length - 1];
            const result = await chat.sendMessage(lastMessage?.parts[0]?.text ?? '');
            const response = result.response;

            return {
                content: response.text(),
                usage: {
                    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
                    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
                },
                metadata: {
                    model: this.model,
                    finishReason: response.candidates?.[0]?.finishReason ?? 'STOP',
                },
            };
        } catch (error) {
            throw new Error(
                `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async *stream(messages: Message[], options?: ChatOptions): AsyncIterableIterator<ChatChunk> {
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');
        const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

        const model = this.client.getGenerativeModel({
            model: this.model,
            systemInstruction: systemPrompt || undefined,
        });

        const geminiMessages = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' as const : 'user' as const,
            parts: [{ text: m.content }],
        }));

        try {
            const chat = model.startChat({
                history: geminiMessages.slice(0, -1),
                generationConfig: {
                    maxOutputTokens: options?.maxTokens ?? 4096,
                    temperature: options?.temperature ?? this.config.temperature,
                },
            });

            const lastMessage = geminiMessages[geminiMessages.length - 1];
            const result = await chat.sendMessageStream(lastMessage?.parts[0]?.text ?? '');

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    yield { delta: text, done: false };
                }
            }

            yield { delta: '', done: true };
        } catch (error) {
            throw new Error(
                `Gemini streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async estimateCost(messages: Message[]): Promise<number> {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);

        // Gemini 2.0 Flash pricing:
        // Input: $0.10 / million tokens
        // Output: $0.40 / million tokens
        const inputCost = (estimatedTokens * 0.7 * 0.10) / 1_000_000;
        const outputCost = (estimatedTokens * 0.3 * 0.40) / 1_000_000;

        return inputCost + outputCost;
    }
}
