import { describe, it, expect } from 'vitest';
import { GenomeSecurityBridge } from '../GenomeSecurityBridge.js';
import { SecurityEventBus } from '../SecurityEventBus.js';
import { getSecurityPreset } from '../SecurityPresets.js';

describe('GenomeSecurityBridge', () => {
    function createBridge(profile: 'paranoid' | 'secure' | 'standard' | 'developer' = 'secure') {
        const config = getSecurityPreset(profile);
        const bus = new SecurityEventBus();
        return { bridge: new GenomeSecurityBridge(config, bus), bus };
    }

    // ─── Inbound Processing ──────────────────────────
    it('should process inbound messages', async () => {
        const { bridge } = createBridge();
        const result = await bridge.processInbound('Hello world', 'telegram', 'user-1');
        expect(result.allowed).toBe(true);
        expect(result.trustLevel).toBe('external');
    });

    it('should detect PII in inbound messages', async () => {
        const { bridge } = createBridge();
        const result = await bridge.processInbound(
            'My card is 4111-1111-1111-1111',
            'telegram',
            'user-1',
        );
        expect(result.allowed).toBe(true);
        expect(result.piiDetected).toContain('credit-card');
        expect(result.sanitized).not.toContain('4111');
    });

    it('should assign correct trust levels', async () => {
        const { bridge } = createBridge();

        expect((await bridge.processInbound('hi', 'cli')).trustLevel).toBe('validated');
        expect((await bridge.processInbound('hi', 'telegram')).trustLevel).toBe('external');
        expect((await bridge.processInbound('hi', 'discord')).trustLevel).toBe('external');
        expect((await bridge.processInbound('hi', 'web')).trustLevel).toBe('untrusted');
        expect((await bridge.processInbound('hi', 'mcp')).trustLevel).toBe('untrusted');
        expect((await bridge.processInbound('hi', 'unknown-channel')).trustLevel).toBe('untrusted');
    });

    it('should classify data in messages', async () => {
        const { bridge } = createBridge();
        const result = await bridge.processInbound(
            'My SSN is 123-45-6789 and my password=secret123',
            'web',
        );
        expect(result.classification).not.toBe('public');
    });

    it('should block restricted data from untrusted sources in paranoid mode', async () => {
        const { bridge } = createBridge('paranoid');
        const result = await bridge.processInbound(
            'Here is my password=sk-ant-abcdefghijklmnopqrstuvwxyz1234567890',
            'web',
        );
        expect(result.allowed).toBe(false);
        expect(result.blockReason).toBeDefined();
    });

    it('should not redact PII in developer mode', async () => {
        const { bridge } = createBridge('developer');
        const result = await bridge.processInbound(
            'My card is 4111-1111-1111-1111',
            'telegram',
        );
        expect(result.sanitized).toContain('4111');
        expect(result.piiDetected).toHaveLength(0);
    });

    // ─── Outbound Processing ─────────────────────────
    it('should pass clean outbound responses', async () => {
        const { bridge } = createBridge();
        const result = await bridge.processOutbound('Here is your answer: Hello!');
        expect(result.clean).toBe(true);
        expect(result.verdict).toBe('pass');
    });

    it('should re-hydrate PII tokens in outbound', async () => {
        const { bridge } = createBridge();
        // First redact
        await bridge.processInbound('My email is test@example.com', 'telegram');
        // Simulate LLM echoing the token
        const piiEngine = bridge.getPIIEngine();
        const redacted = piiEngine.redact('Contact at test@example.com');
        const result = await bridge.processOutbound(redacted.redacted);
        expect(result.sanitized).toContain('test@example.com');
    });

    // ─── Security Events ─────────────────────────────
    it('should emit events to the bus', async () => {
        const { bridge, bus } = createBridge();
        const events: string[] = [];
        bus.onAny((e) => events.push(e.type));

        await bridge.processInbound('Hello', 'telegram', 'user-1');
        await bridge.processOutbound('Response');

        expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should emit PII events when PII is detected', async () => {
        const { bridge, bus } = createBridge();
        const events: string[] = [];
        bus.on('security:pii-redacted', () => events.push('pii'));

        await bridge.processInbound('Card: 4111-1111-1111-1111', 'telegram');

        expect(events).toContain('pii');
    });

    // ─── Status ──────────────────────────────────────
    it('should track status', async () => {
        const { bridge } = createBridge();

        await bridge.processInbound('Hello', 'telegram');
        await bridge.processInbound('Card: 4111-1111-1111-1111', 'telegram');
        await bridge.processOutbound('Response');

        const status = bridge.getStatus();
        expect(status.profile).toBe('secure');
        expect(status.inboundScanned).toBe(2);
        expect(status.outboundScanned).toBe(1);
        expect(status.piiRedacted).toBeGreaterThanOrEqual(1);
    });

    // ─── Session Cleanup ─────────────────────────────
    it('should clear PII vault on session end', async () => {
        const { bridge } = createBridge();
        await bridge.processInbound('Email: test@test.com', 'telegram');
        expect(bridge.getPIIEngine().getVaultSize()).toBeGreaterThan(0);

        bridge.clearSession();
        expect(bridge.getPIIEngine().getVaultSize()).toBe(0);
    });
});
