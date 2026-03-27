/**
 * gsep serve — Start GSEP as an LLM proxy server
 *
 * Makes GSEP accessible to any platform (n8n, Retell AI, Voiceflow, etc.)
 * by mimicking the LLM provider's API.
 *
 * Usage:
 *   gsep serve --port 3000
 *   gsep serve --purpose "Customer support for Acme Corp"
 *
 * The user just changes the API URL in their platform:
 *   Before: https://api.openai.com
 *   After:  http://localhost:3000
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-27
 */

import chalk from 'chalk';
import boxen from 'boxen';

export async function serve(options: {
    port: string;
    host: string;
    purpose?: string;
    allowedTopics?: string;
    forbiddenTopics?: string;
}) {
    const port = parseInt(options.port, 10);
    const host = options.host;

    console.log(chalk.cyan('\n🧬 Starting GSEP LLM Proxy...\n'));

    // ─── Detect LLM provider from env vars ──────────────────
    const provider = detectProvider();
    if (!provider) {
        console.log(chalk.red('❌ No LLM API key found.\n'));
        console.log(chalk.white('Set one of these environment variables:\n'));
        console.log(chalk.gray('  export ANTHROPIC_API_KEY=sk-ant-...'));
        console.log(chalk.gray('  export OPENAI_API_KEY=sk-...'));
        console.log(chalk.gray('  export GOOGLE_API_KEY=...'));
        console.log(chalk.gray('  export OLLAMA_HOST=http://localhost:11434\n'));
        process.exit(1);
    }

    console.log(chalk.gray(`  Provider: ${provider.name}`));
    console.log(chalk.gray(`  Model: ${provider.model}`));
    if (options.purpose) {
        console.log(chalk.gray(`  Purpose: ${options.purpose}`));
    }
    console.log('');

    // ─── Dynamic import to avoid loading everything at CLI startup ──
    const { default: Fastify } = await import('fastify');
    const { GSEP, InMemoryStorageAdapter } = await import('@gsep/core');

    // Create LLM adapter dynamically
    const llm = await createLLMAdapter(provider);

    // Create Fastify app
    const app = Fastify({ logger: false });

    // Initialize GSEP genome
    const gsep = new GSEP({
        llm,
        storage: new InMemoryStorageAdapter(),
    });
    await gsep.initialize();

    const genome = await gsep.createGenome({
        name: 'gsep-proxy',
        config: {
            purposeLock: options.purpose ? {
                enabled: true,
                purpose: options.purpose,
                allowedTopics: options.allowedTopics?.split(',').map(t => t.trim()),
                forbiddenTopics: options.forbiddenTopics?.split(',').map(t => t.trim()),
            } : undefined,
        },
    });

    // ─── OpenAI-Compatible: POST /v1/chat/completions ───────
    app.post('/v1/chat/completions', async (request, reply) => {
        const body = request.body as {
            model?: string;
            messages: Array<{ role: string; content: string }>;
            stream?: boolean;
        };

        if (!body.messages || !Array.isArray(body.messages)) {
            return reply.status(400).send({
                error: { message: 'messages is required', type: 'invalid_request_error' },
            });
        }

        try {
            const userMessages = body.messages.filter(m => m.role === 'user');
            const lastMsg = userMessages[userMessages.length - 1]?.content ?? '';

            const response = await genome.chat(lastMsg, {
                userId: 'proxy-user',
                taskType: 'general',
            });

            const promptTokens = body.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
            const completionTokens = Math.ceil(response.length / 4);

            // Streaming mode — SSE chunked delivery
            if (body.stream) {
                const id = `chatcmpl-gsep-${Date.now()}`;
                const created = Math.floor(Date.now() / 1000);
                const model = body.model ?? llm.model;

                reply.raw.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                });

                // Chunk the response into words for realistic streaming
                const words = response.split(/(\s+)/);
                for (const word of words) {
                    const chunk = {
                        id,
                        object: 'chat.completion.chunk',
                        created,
                        model,
                        choices: [{
                            index: 0,
                            delta: { content: word },
                            finish_reason: null,
                        }],
                    };
                    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }

                // Send final chunk
                reply.raw.write(`data: ${JSON.stringify({
                    id, object: 'chat.completion.chunk', created, model,
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                })}\n\n`);
                reply.raw.write('data: [DONE]\n\n');
                reply.raw.end();
                return;
            }

            // Non-streaming mode
            return reply.send({
                id: `chatcmpl-gsep-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: body.model ?? llm.model,
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: response },
                    finish_reason: 'stop',
                }],
                usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: promptTokens + completionTokens,
                },
            });
        } catch (err) {
            return reply.status(500).send({
                error: {
                    message: err instanceof Error ? err.message : 'Internal error',
                    type: 'server_error',
                },
            });
        }
    });

    // ─── Anthropic-Compatible: POST /v1/messages ────────────
    app.post('/v1/messages', async (request, reply) => {
        const body = request.body as {
            model?: string;
            messages: Array<{ role: string; content: string }>;
            system?: string;
        };

        if (!body.messages || !Array.isArray(body.messages)) {
            return reply.status(400).send({
                error: { message: 'messages is required', type: 'invalid_request_error' },
            });
        }

        try {
            const userMessages = body.messages.filter(m => m.role === 'user');
            const lastMsg = userMessages[userMessages.length - 1]?.content ?? '';

            const response = await genome.chat(lastMsg, {
                userId: 'proxy-user',
                taskType: 'general',
            });

            const inputTokens = body.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
            const outputTokens = Math.ceil(response.length / 4);

            return reply.send({
                id: `msg-gsep-${Date.now()}`,
                type: 'message',
                role: 'assistant',
                content: [{ type: 'text', text: response }],
                model: body.model ?? llm.model,
                stop_reason: 'end_turn',
                usage: { input_tokens: inputTokens, output_tokens: outputTokens },
            });
        } catch (err) {
            return reply.status(500).send({
                error: {
                    message: err instanceof Error ? err.message : 'Internal error',
                    type: 'server_error',
                },
            });
        }
    });

    // ─── Health + Models ────────────────────────────────────
    app.get('/v1/health', async (_req, reply) => {
        const report = genome.generateWeeklyReport();
        return reply.send({
            status: 'ok',
            gsep: true,
            interactions: report.conversations.total,
            quality: report.quality.endScore,
            trend: report.quality.trend,
        });
    });

    app.get('/v1/models', async (_req, reply) => {
        return reply.send({
            object: 'list',
            data: [{
                id: llm.model,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'gsep-proxy',
            }],
        });
    });

    // ─── GSEP Report Endpoint ───────────────────────────────
    app.get('/gsep/report', async (_req, reply) => {
        return reply.send(genome.generateWeeklyReport());
    });

    // ─── Start Server ───────────────────────────────────────
    await app.listen({ port, host });

    console.log(
        boxen(
            chalk.green.bold('🧬 GSEP LLM Proxy is running!\n\n') +
            chalk.white('OpenAI-compatible endpoint:\n') +
            chalk.cyan(`  http://${host}:${port}/v1/chat/completions\n\n`) +
            chalk.white('Anthropic-compatible endpoint:\n') +
            chalk.cyan(`  http://${host}:${port}/v1/messages\n\n`) +
            chalk.white('Health check:\n') +
            chalk.cyan(`  http://${host}:${port}/v1/health\n\n`) +
            chalk.white('GSEP Report:\n') +
            chalk.cyan(`  http://${host}:${port}/gsep/report\n\n`) +
            chalk.gray('In your platform (n8n, Retell AI, etc.), change the API URL to:\n') +
            chalk.yellow(`  http://localhost:${port}`),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green',
            }
        )
    );
}

// ─── Provider Detection ─────────────────────────────────

interface ProviderInfo {
    name: string;
    model: string;
    type: string;
}

function detectProvider(): ProviderInfo | null {
    if (process.env.ANTHROPIC_API_KEY) {
        return { name: 'Anthropic Claude', model: 'claude-sonnet-4-5-20250929', type: 'anthropic' };
    }
    if (process.env.OPENAI_API_KEY) {
        return { name: 'OpenAI', model: 'gpt-4', type: 'openai' };
    }
    if (process.env.GOOGLE_API_KEY) {
        return { name: 'Google Gemini', model: 'gemini-2.0-flash', type: 'google' };
    }
    if (process.env.OLLAMA_HOST) {
        return { name: 'Ollama (local)', model: 'llama3', type: 'ollama' };
    }
    if (process.env.PERPLEXITY_API_KEY) {
        return { name: 'Perplexity', model: 'sonar', type: 'perplexity' };
    }
    return null;
}

async function createLLMAdapter(provider: ProviderInfo): Promise<import('@gsep/core').LLMAdapter> {
    const pkg = {
        anthropic: '@gsep/adapters-llm-anthropic',
        openai: '@gsep/adapters-llm-openai',
        google: '@gsep/adapters-llm-google',
        ollama: '@gsep/adapters-llm-ollama',
        perplexity: '@gsep/adapters-llm-perplexity',
    }[provider.type];

    const className = {
        anthropic: 'ClaudeAdapter',
        openai: 'OpenAIAdapter',
        google: 'GeminiAdapter',
        ollama: 'OllamaAdapter',
        perplexity: 'PerplexityAdapter',
    }[provider.type];

    const envKey = {
        anthropic: process.env.ANTHROPIC_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        perplexity: process.env.PERPLEXITY_API_KEY,
    }[provider.type as string];

    try {
        const mod = await import(pkg! as string) as Record<string, unknown>;
        const AdapterClass = (mod[className!] ?? mod.default) as new (config: Record<string, unknown>) => import('@gsep/core').LLMAdapter;

        const config: Record<string, unknown> = { model: provider.model };
        if (provider.type === 'ollama') {
            config.host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
        } else if (envKey) {
            config.apiKey = envKey;
        }

        return new AdapterClass(config);
    } catch {
        console.error(chalk.red(`\n❌ Failed to load ${pkg}. Install it:\n`));
        console.error(chalk.gray(`  npm install ${pkg}\n`));
        process.exit(1);
    }
}
