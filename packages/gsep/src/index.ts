/**
 * gsep — Genomic Self-Evolving Prompts
 *
 * One install. One line. Your AI agent evolves.
 *
 * @example Quick start (reads ANTHROPIC_API_KEY from env):
 * ```typescript
 * import { GSEP } from 'gsep';
 *
 * const agent = await GSEP.quickStart();
 * const response = await agent.chat('Hello!');
 * ```
 *
 * @example With OpenAI:
 * ```typescript
 * import { GSEP, OpenAIAdapter } from 'gsep';
 *
 * const agent = await GSEP.quickStart({
 *     provider: 'openai',
 *     model: 'gpt-4',
 * });
 * ```
 *
 * @example With local Ollama:
 * ```typescript
 * import { GSEP, OllamaAdapter } from 'gsep';
 *
 * const agent = await GSEP.quickStart({
 *     llm: new OllamaAdapter({ model: 'llama3' }),
 * });
 * ```
 *
 * @author Luis Alfredo Velasquez Duran
 * @license MIT
 */

// ─── Re-export everything from @gsep/core ──────────────
export * from '@gsep/core';

// ─── LLM Adapters (all included) ───────────────────────

// Anthropic Claude
export { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
export type { ClaudeAdapterConfig } from '@gsep/adapters-llm-anthropic';

// OpenAI (GPT-4, GPT-3.5, etc.)
export { OpenAIAdapter } from '@gsep/adapters-llm-openai';
export type { OpenAIAdapterConfig } from '@gsep/adapters-llm-openai';

// Google Gemini
export { GeminiAdapter } from '@gsep/adapters-llm-google';
export type { GeminiAdapterConfig } from '@gsep/adapters-llm-google';

// Ollama (local models)
export { OllamaAdapter } from '@gsep/adapters-llm-ollama';
export type { OllamaAdapterConfig } from '@gsep/adapters-llm-ollama';

// Perplexity (web-search powered)
export { PerplexityAdapter } from '@gsep/adapters-llm-perplexity';
export type { PerplexityAdapterConfig } from '@gsep/adapters-llm-perplexity';
