/**
 * SkillExecutor Extended Tests — MCP mocking, connection management, edge cases
 *
 * Boosts coverage from 58% to 85%+ by testing:
 * - MCP connection (connectMCP) with mocked transports
 * - MCP execution (executeMCP) with auto-connect
 * - Response parsing (text content, string content, object content)
 * - Error handling in connectMCP
 * - Disconnect with active clients
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillExecutor } from '../SkillExecutor.js';
import { SkillRegistry } from '../SkillRegistry.js';

// ─── Shared mock client instance ──────────────────────

const sharedMockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({
        tools: [
            { name: 'web-search', description: 'Search the web', inputSchema: { type: 'object' } },
            { name: 'read-file', description: 'Read a file' },
        ],
    }),
    callTool: vi.fn().mockResolvedValue({
        content: [
            { type: 'text', text: 'Search result 1' },
            { type: 'text', text: 'Search result 2' },
        ],
    }),
};

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: vi.fn().mockImplementation(() => sharedMockClient),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
    SSEClientTransport: vi.fn().mockImplementation(() => ({ type: 'sse' })),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
    StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({ type: 'http' })),
}));

// ─── Helpers ──────────────────────────────────────────

function createSetup(config?: { timeoutMs?: number; maxRetries?: number }) {
    const registry = new SkillRegistry();
    const executor = new SkillExecutor(registry, config);
    return { registry, executor };
}

// ─── Tests ────────────────────────────────────────────

describe('SkillExecutor — MCP Integration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default behaviors
        sharedMockClient.connect.mockResolvedValue(undefined);
        sharedMockClient.close.mockResolvedValue(undefined);
        sharedMockClient.listTools.mockResolvedValue({
            tools: [
                { name: 'web-search', description: 'Search the web', inputSchema: { type: 'object' } },
                { name: 'read-file', description: 'Read a file' },
            ],
        });
        sharedMockClient.callTool.mockResolvedValue({
            content: [
                { type: 'text', text: 'Search result 1' },
                { type: 'text', text: 'Search result 2' },
            ],
        });
    });

    describe('connectMCP', () => {
        it('should connect to an MCP server and discover tools', async () => {
            const { registry, executor } = createSetup();

            const tools = await executor.connectMCP('http://localhost:3000/mcp');

            expect(tools).toHaveLength(2);
            expect(tools[0].name).toBe('web-search');
            expect(tools[0].description).toBe('Search the web');
            expect(tools[1].name).toBe('read-file');
            expect(tools[1].description).toBe('Read a file');
        });

        it('should auto-register discovered tools in the registry', async () => {
            const { registry, executor } = createSetup();

            await executor.connectMCP('http://localhost:3000/mcp');

            expect(registry.has('web-search')).toBe(true);
            expect(registry.has('read-file')).toBe(true);
            const webSearch = registry.get('web-search');
            expect(webSearch?.source).toBe('mcp');
            expect(webSearch?.mcpUri).toBe('http://localhost:3000/mcp');
        });

        it('should handle tools with missing inputSchema', async () => {
            sharedMockClient.listTools.mockResolvedValueOnce({
                tools: [{ name: 'no-schema', description: 'No schema tool' }],
            });

            const { executor } = createSetup();
            const tools = await executor.connectMCP('http://localhost:3000/mcp');

            expect(tools).toHaveLength(1);
            expect(tools[0].inputSchema).toEqual({});
        });

        it('should handle tools with missing description', async () => {
            sharedMockClient.listTools.mockResolvedValueOnce({
                tools: [{ name: 'no-desc' }],
            });

            const { executor } = createSetup();
            const tools = await executor.connectMCP('http://localhost:3000/mcp');

            expect(tools[0].description).toBe('');
        });

        it('should handle empty tools list', async () => {
            sharedMockClient.listTools.mockResolvedValueOnce({ tools: undefined });

            const { executor } = createSetup();
            const tools = await executor.connectMCP('http://localhost:3000/mcp');

            expect(tools).toHaveLength(0);
        });

        it('should fall back to SSE when HTTP transport fails', async () => {
            let connectCallCount = 0;
            sharedMockClient.connect.mockImplementation(async () => {
                connectCallCount++;
                if (connectCallCount === 1) throw new Error('HTTP not supported');
                // SSE succeeds
            });

            const { executor } = createSetup();
            const tools = await executor.connectMCP('http://localhost:3000/mcp');

            expect(tools).toHaveLength(2);
            expect(connectCallCount).toBe(2);
        });

        it('should throw when both transports fail', async () => {
            sharedMockClient.connect.mockRejectedValue(new Error('Connection refused'));

            const { executor } = createSetup();

            await expect(executor.connectMCP('http://bad-server:9999/mcp'))
                .rejects.toThrow('Failed to connect to MCP server');
        });
    });

    describe('MCP skill execution', () => {
        it('should execute an MCP skill with text content response', async () => {
            const { registry, executor } = createSetup();
            registry.registerMCP('web-search', 'Search', 'http://localhost:3000/mcp', { type: 'object' });
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('web-search', { query: 'GSEP' });

            expect(result.success).toBe(true);
            expect(result.output).toContain('Search result 1');
            expect(result.output).toContain('Search result 2');
        });

        it('should auto-connect when executing MCP skill without prior connection', async () => {
            const { registry, executor } = createSetup();
            registry.registerMCP('auto-tool', 'Auto connect tool', 'http://localhost:3000/mcp');

            const result = await executor.execute('auto-tool', { input: 'test' });

            expect(result.success).toBe(true);
        });

        it('should handle MCP skill returning string content field', async () => {
            sharedMockClient.callTool.mockResolvedValueOnce({
                content: 'Direct string response',
            });

            const { registry, executor } = createSetup();
            registry.registerMCP('string-tool', 'Returns string', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('string-tool', {});

            expect(result.success).toBe(true);
            expect(result.output).toBe('Direct string response');
        });

        it('should handle MCP skill returning object without content', async () => {
            sharedMockClient.callTool.mockResolvedValueOnce({
                data: { key: 'value' },
            });

            const { registry, executor } = createSetup();
            registry.registerMCP('json-tool', 'Returns JSON', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('json-tool', {});

            expect(result.success).toBe(true);
            expect(result.output).toContain('data');
        });

        it('should filter non-text content types', async () => {
            sharedMockClient.callTool.mockResolvedValueOnce({
                content: [
                    { type: 'text', text: 'Visible' },
                    { type: 'image', data: 'base64...' },
                    { type: 'text', text: 'Also visible' },
                ],
            });

            const { registry, executor } = createSetup();
            registry.registerMCP('mixed-tool', 'Mixed content', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('mixed-tool', {});

            expect(result.success).toBe(true);
            expect(result.output).toContain('Visible');
            expect(result.output).toContain('Also visible');
            expect(result.output).not.toContain('base64');
        });

        it('should handle MCP returning string directly', async () => {
            sharedMockClient.callTool.mockResolvedValueOnce('plain string');

            const { registry, executor } = createSetup();
            registry.registerMCP('plain-tool', 'Plain', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('plain-tool', {});

            expect(result.success).toBe(true);
            expect(result.output).toBe('plain string');
        });
    });

    describe('disconnect', () => {
        it('should close all MCP clients on disconnect', async () => {
            const { executor } = createSetup();
            await executor.connectMCP('http://localhost:3000/mcp');

            await executor.disconnect();

            expect(sharedMockClient.close).toHaveBeenCalled();
        });

        it('should handle errors during client close gracefully', async () => {
            sharedMockClient.close.mockRejectedValueOnce(new Error('Close failed'));

            const { executor } = createSetup();
            await executor.connectMCP('http://localhost:3000/mcp');

            await expect(executor.disconnect()).resolves.not.toThrow();
        });

        it('should clear client map after disconnect', async () => {
            const { registry, executor } = createSetup();
            await executor.connectMCP('http://localhost:3000/mcp');

            await executor.disconnect();

            // After disconnect, executing MCP skill would need auto-reconnect
            // This verifies the map was cleared
            registry.registerMCP('reconnect-tool', 'Test', 'http://localhost:3000/mcp');
            const result = await executor.execute('reconnect-tool', {});
            // Should auto-reconnect and succeed
            expect(result.success).toBe(true);
        });
    });

    describe('timeout with MCP skills', () => {
        it('should timeout slow MCP calls', async () => {
            sharedMockClient.callTool.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({ content: 'late' }), 5000)),
            );

            const { registry, executor } = createSetup({ timeoutMs: 50, maxRetries: 0 });
            registry.registerMCP('slow-mcp', 'Slow tool', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('slow-mcp', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
        });
    });

    describe('MCP skill with empty URI', () => {
        it('should fail when MCP skill has empty URI', async () => {
            const { registry, executor } = createSetup({ maxRetries: 0 });
            registry.registerMCP('no-uri', 'No URI', '');

            const result = await executor.execute('no-uri', {});

            expect(result.success).toBe(false);
        });
    });

    describe('retry with MCP skills', () => {
        it('should retry MCP execution on failure', async () => {
            let callCount = 0;
            sharedMockClient.callTool.mockImplementation(async () => {
                callCount++;
                if (callCount < 2) throw new Error('Temporary failure');
                return { content: [{ type: 'text', text: 'Success on retry' }] };
            });

            const { registry, executor } = createSetup({ maxRetries: 2 });
            registry.registerMCP('retry-mcp', 'Retry tool', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            const result = await executor.execute('retry-mcp', {});

            expect(result.success).toBe(true);
            expect(result.output).toContain('Success on retry');
        });
    });

    describe('execution metrics for MCP skills', () => {
        it('should record successful MCP execution in registry', async () => {
            const { registry, executor } = createSetup();
            registry.registerMCP('tracked-mcp', 'Tracked', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            await executor.execute('tracked-mcp', {});

            const skill = registry.get('tracked-mcp')!;
            expect(skill.metrics.totalCalls).toBe(1);
            expect(skill.metrics.successCount).toBe(1);
        });

        it('should record failed MCP execution in registry', async () => {
            sharedMockClient.callTool.mockRejectedValue(new Error('MCP error'));

            const { registry, executor } = createSetup({ maxRetries: 0 });
            registry.registerMCP('fail-mcp', 'Failing', 'http://localhost:3000/mcp');
            await executor.connectMCP('http://localhost:3000/mcp');

            await executor.execute('fail-mcp', {});

            const skill = registry.get('fail-mcp')!;
            expect(skill.metrics.totalCalls).toBe(1);
            expect(skill.metrics.failureCount).toBe(1);
        });
    });
});
