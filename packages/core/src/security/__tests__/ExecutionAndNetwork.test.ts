import { describe, it, expect } from 'vitest';
import { CommandExecutionGuard } from '../CommandExecutionGuard.js';
import { FileSystemBoundary } from '../FileSystemBoundary.js';
import { OutboundAllowlist } from '../OutboundAllowlist.js';
import { NetworkAuditLogger } from '../NetworkAuditLogger.js';
import { CapabilityBroker } from '../CapabilityBroker.js';
import { SkillManifest } from '../SkillManifest.js';
import { SkillSigner } from '../SkillSigner.js';
import { SecurityEventBus } from '../SecurityEventBus.js';
import { getSecurityPreset } from '../SecurityPresets.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const bus = () => new SecurityEventBus();

// ─── CommandExecutionGuard ───────────────────────────────

describe('CommandExecutionGuard', () => {
    it('should allow safe commands', () => {
        const guard = new CommandExecutionGuard(bus());
        expect(guard.evaluate({ command: 'ls', args: ['-la'] })).toBe('allow');
        expect(guard.evaluate({ command: 'git', args: ['status'] })).toBe('allow');
        expect(guard.evaluate({ command: 'node', args: ['--version'] })).toBe('allow');
    });

    it('should deny blocked commands', () => {
        const guard = new CommandExecutionGuard(bus());
        expect(guard.evaluate({ command: 'dd', args: [] })).toBe('deny');
        expect(guard.evaluate({ command: 'mkfs', args: [] })).toBe('deny');
        expect(guard.evaluate({ command: 'eval', args: ['something'] })).toBe('deny');
    });

    it('should deny shell wrappers', () => {
        const guard = new CommandExecutionGuard(bus());
        expect(guard.evaluate({ command: 'sh', args: ['-c', 'echo hello'] })).toBe('deny');
        expect(guard.evaluate({ command: 'bash', args: ['-c', 'rm -rf /'] })).toBe('deny');
    });

    it('should flag destructive commands as ask', () => {
        const guard = new CommandExecutionGuard(bus());
        expect(guard.evaluate({ command: 'rm', args: ['file.txt'] })).toBe('ask');
        expect(guard.evaluate({ command: 'sudo', args: ['apt', 'update'] })).toBe('ask');
    });

    it('should deny unknown commands', () => {
        const guard = new CommandExecutionGuard(bus());
        expect(guard.evaluate({ command: 'unknown-binary', args: [] })).toBe('deny');
    });

    it('should parse command strings safely', () => {
        const parsed = CommandExecutionGuard.parseCommand('git commit -m "hello world"');
        expect(parsed.command).toBe('git');
        expect(parsed.args).toEqual(['commit', '-m', 'hello world']);
    });

    it('should handle escaped quotes in parsing', () => {
        const parsed = CommandExecutionGuard.parseCommand("echo 'it\\'s fine'");
        expect(parsed.command).toBe('echo');
    });

    it('should execute allowed commands', async () => {
        const guard = new CommandExecutionGuard(bus());
        const result = await guard.execute({ command: 'echo', args: ['hello'] });
        expect(result.decision).toBe('allow');
        expect(result.stdout?.trim()).toBe('hello');
    });

    it('should deny execution of blocked commands', async () => {
        const guard = new CommandExecutionGuard(bus());
        const result = await guard.execute({ command: 'dd', args: [] });
        expect(result.decision).toBe('deny');
        expect(result.denyReason).toBeDefined();
    });

    it('should track stats', async () => {
        const guard = new CommandExecutionGuard(bus());
        await guard.execute({ command: 'echo', args: ['1'] });
        await guard.execute({ command: 'dd', args: [] });
        const stats = guard.getStats();
        expect(stats.totalRequests).toBe(2);
        expect(stats.allowed).toBe(1);
        expect(stats.denied).toBe(1);
    });
});

// ─── FileSystemBoundary ──────────────────────────────────

describe('FileSystemBoundary', () => {
    const home = homedir();

    it('should allow paths in allowed list', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: ['~/.genome', '~/Documents/Genome'],
            deniedPaths: ['~/.ssh'],
        });
        expect(boundary.isAllowed(join(home, '.genome', 'config.enc'), 'read')).toBe(true);
    });

    it('should deny paths in denied list', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: ['~'],
            deniedPaths: ['~/.ssh', '~/.gnupg'],
        });
        expect(boundary.isAllowed(join(home, '.ssh', 'id_rsa'), 'read')).toBe(false);
        expect(boundary.isAllowed(join(home, '.gnupg', 'private-keys'), 'read')).toBe(false);
    });

    it('should deny paths not in allowed list', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: ['~/.genome'],
            deniedPaths: [],
        });
        expect(boundary.isAllowed('/etc/passwd', 'read')).toBe(false);
    });

    it('should deny takes priority over allow', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: ['~'],
            deniedPaths: ['~/.ssh'],
        });
        // ~/.ssh is under ~ (allowed) but explicitly denied
        expect(boundary.isAllowed(join(home, '.ssh', 'id_rsa'), 'read')).toBe(false);
    });

    it('should allow home dir access when configured', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: [],
            deniedPaths: ['~/.ssh'],
            allowHomeDir: true,
        });
        expect(boundary.isAllowed(join(home, 'Documents', 'file.txt'), 'read')).toBe(true);
        expect(boundary.isAllowed('/etc/passwd', 'read')).toBe(false);
    });

    it('should track stats', () => {
        const boundary = new FileSystemBoundary(bus(), {
            allowedPaths: ['~/.genome'],
            deniedPaths: ['~/.ssh'],
        });
        boundary.check(join(home, '.genome', 'x'), 'read');
        boundary.check(join(home, '.ssh', 'y'), 'read');
        const stats = boundary.getStats();
        expect(stats.totalChecks).toBe(2);
        expect(stats.allowed).toBe(1);
        expect(stats.denied).toBe(1);
    });
});

// ─── OutboundAllowlist ───────────────────────────────────

describe('OutboundAllowlist', () => {
    it('should allow whitelisted domains', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: ['api.openai.com', '*.anthropic.com'],
            blockPrivateNetworks: true,
            mode: 'strict',
        });
        expect(allowlist.check('api.openai.com').allowed).toBe(true);
        expect(allowlist.check('api.anthropic.com').allowed).toBe(true);
    });

    it('should block non-whitelisted domains in strict mode', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: ['api.openai.com'],
            blockPrivateNetworks: true,
            mode: 'strict',
        });
        expect(allowlist.check('evil.com').allowed).toBe(false);
    });

    it('should block private networks (SSRF)', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: [],
            blockPrivateNetworks: true,
            mode: 'broad',
        });
        expect(allowlist.check('10.0.0.1').allowed).toBe(false);
        expect(allowlist.check('192.168.1.1').allowed).toBe(false);
        expect(allowlist.check('localhost').allowed).toBe(false);
        expect(allowlist.check('169.254.169.254').allowed).toBe(false);
    });

    it('should support wildcard domains', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: ['*.openai.com'],
            blockPrivateNetworks: false,
            mode: 'strict',
        });
        expect(allowlist.check('api.openai.com').allowed).toBe(true);
        expect(allowlist.check('chat.openai.com').allowed).toBe(true);
        expect(allowlist.check('openai.com').allowed).toBe(true);
        expect(allowlist.check('not-openai.com').allowed).toBe(false);
    });

    it('should allow everything in unrestricted mode', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: [],
            blockPrivateNetworks: false,
            mode: 'unrestricted',
        });
        expect(allowlist.check('anything.com').allowed).toBe(true);
    });

    it('should block suspicious domains in broad mode', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: [],
            blockPrivateNetworks: false,
            mode: 'broad',
        });
        expect(allowlist.check('evil.onion').allowed).toBe(false);
        expect(allowlist.check('webhook-collector.io').allowed).toBe(false);
    });

    it('should check full URLs', () => {
        const allowlist = new OutboundAllowlist(bus(), {
            allowedDomains: ['api.openai.com'],
            blockPrivateNetworks: true,
            mode: 'strict',
        });
        expect(allowlist.checkURL('https://api.openai.com/v1/chat').allowed).toBe(true);
        expect(allowlist.checkURL('https://evil.com/steal').allowed).toBe(false);
    });
});

// ─── NetworkAuditLogger ──────────────────────────────────

describe('NetworkAuditLogger', () => {
    it('should auto-subscribe to network events', () => {
        const b = bus();
        const logger = new NetworkAuditLogger(b);

        b.emit({
            type: 'security:net-allowed',
            timestamp: new Date(),
            layer: 6,
            decision: 'allow',
            actor: {},
            resource: { type: 'outbound', id: 'api.openai.com' },
            severity: 'info',
        });

        expect(logger.getEntryCount()).toBe(1);
    });

    it('should provide traffic summary', () => {
        const b = bus();
        const logger = new NetworkAuditLogger(b);

        logger.logRequest({ method: 'POST', hostname: 'api.openai.com', port: 443, path: '/v1/chat', requestSize: 2048, responseStatus: 200, responseSize: 512, durationMs: 1200 });
        logger.logRequest({ method: 'GET', hostname: 'api.anthropic.com', port: 443, path: '/v1', requestSize: 100, responseStatus: 200, responseSize: 50, durationMs: 300 });

        const summary = logger.getSummary();
        expect(summary.totalRequests).toBe(2);
        expect(summary.byHostname['api.openai.com']).toBe(1);
        expect(summary.totalBytesOut).toBe(2148);
    });
});

// ─── SkillManifest ───────────────────────────────────────

describe('SkillManifest', () => {
    it('should parse a valid manifest', () => {
        const manifest = SkillManifest.parse({
            name: 'file-manager',
            version: '1.0.0',
            author: 'genome-team',
            permissions: { required: ['fs:read', 'fs:write'], optional: ['net:outbound'] },
            dataAccess: ['public', 'internal'],
        });
        expect(manifest.data.name).toBe('file-manager');
        expect(manifest.requires('fs:read')).toBe(true);
        expect(manifest.requires('exec:command')).toBe(false);
        expect(manifest.optionallyRequests('net:outbound')).toBe(true);
        expect(manifest.canAccessData('public')).toBe(true);
        expect(manifest.canAccessData('restricted')).toBe(false);
    });

    it('should reject invalid capabilities', () => {
        expect(() => SkillManifest.parse({
            permissions: { required: ['invalid:cap' as never], optional: [] },
        })).toThrow('Unknown capability');
    });

    it('should create default manifest', () => {
        const manifest = SkillManifest.default('test-skill');
        expect(manifest.data.name).toBe('test-skill');
        expect(manifest.data.permissions.required).toEqual([]);
    });
});

// ─── SkillSigner ─────────────────────────────────────────

describe('SkillSigner', () => {
    it('should generate key pairs', () => {
        const keys = SkillSigner.generateKeyPair();
        expect(keys.publicKey).toBeDefined();
        expect(keys.privateKey).toBeDefined();
        expect(keys.publicKey.length).toBeGreaterThan(0);
    });

    it('should sign and verify skills', () => {
        const keys = SkillSigner.generateKeyPair();
        const signer = new SkillSigner();

        const sig = signer.sign('console.log("hello")', '{"name":"test"}', '1.0.0', keys.privateKey);
        expect(sig.signature).toBeDefined();
        expect(sig.contentHash).toBeDefined();

        const valid = signer.verify('console.log("hello")', '{"name":"test"}', '1.0.0', sig, keys.publicKey);
        expect(valid).toBe(true);
    });

    it('should reject tampered code', () => {
        const keys = SkillSigner.generateKeyPair();
        const signer = new SkillSigner();

        const sig = signer.sign('console.log("hello")', '{"name":"test"}', '1.0.0', keys.privateKey);
        const valid = signer.verify('console.log("EVIL")', '{"name":"test"}', '1.0.0', sig, keys.publicKey);
        expect(valid).toBe(false);
    });

    it('should reject tampered manifest', () => {
        const keys = SkillSigner.generateKeyPair();
        const signer = new SkillSigner();

        const sig = signer.sign('code', '{"name":"test"}', '1.0.0', keys.privateKey);
        const valid = signer.verify('code', '{"name":"hacked"}', '1.0.0', sig, keys.publicKey);
        expect(valid).toBe(false);
    });

    it('should detect trusted publishers', () => {
        const keys = SkillSigner.generateKeyPair();
        const signer = new SkillSigner();

        const sig = signer.sign('code', '{}', '1.0', keys.privateKey);
        // Add the public key from the signature (derived from private key)
        signer.addTrustedKey('genome-official', sig.publicKey);
        expect(signer.isTrustedPublisher(sig)).toBe(true);
    });
});

// ─── CapabilityBroker ────────────────────────────────────

describe('CapabilityBroker', () => {
    it('should grant capabilities declared in manifest', () => {
        const config = getSecurityPreset('secure');
        const broker = new CapabilityBroker(bus(), config);

        broker.registerSkill('file-manager', {
            name: 'file-manager',
            version: '1.0',
            author: 'test',
            permissions: { required: ['fs:read', 'fs:write'], optional: [] },
            dataAccess: ['public'],
            restrictions: {},
        });

        const check = broker.checkCapability('file-manager', 'fs:read');
        expect(check.allowed).toBe(true);
    });

    it('should deny undeclared capabilities', () => {
        const config = getSecurityPreset('secure');
        const broker = new CapabilityBroker(bus(), config);

        broker.registerSkill('file-manager', {
            name: 'file-manager',
            version: '1.0',
            author: 'test',
            permissions: { required: ['fs:read'], optional: [] },
            dataAccess: ['public'],
            restrictions: {},
        });

        const check = broker.checkCapability('file-manager', 'exec:command');
        expect(check.allowed).toBe(false);
    });

    it('should deny unregistered skills in secure mode', () => {
        const config = getSecurityPreset('secure');
        const broker = new CapabilityBroker(bus(), config);

        const check = broker.checkCapability('unknown-skill', 'fs:read');
        expect(check.allowed).toBe(false);
    });

    it('should allow everything when broker is disabled', () => {
        const config = getSecurityPreset('developer');
        const broker = new CapabilityBroker(bus(), config);

        const check = broker.checkCapability('any-skill', 'exec:command');
        expect(check.allowed).toBe(true);
    });

    it('should revoke capabilities', () => {
        const config = getSecurityPreset('secure');
        const broker = new CapabilityBroker(bus(), config);

        broker.registerSkill('test', {
            name: 'test', version: '1.0', author: 'x',
            permissions: { required: ['fs:read'], optional: [] },
            dataAccess: ['public'], restrictions: {},
        });

        broker.checkCapability('test', 'fs:read'); // grants
        expect(broker.getActiveGrants('test')).toHaveLength(1);

        broker.revokeAll('test');
        expect(broker.getActiveGrants('test')).toHaveLength(0);
    });

    it('should check data access', () => {
        const config = getSecurityPreset('secure');
        const broker = new CapabilityBroker(bus(), config);

        broker.registerSkill('safe-skill', {
            name: 'safe-skill', version: '1.0', author: 'x',
            permissions: { required: [], optional: [] },
            dataAccess: ['public', 'internal'], restrictions: {},
        });

        expect(broker.checkDataAccess('safe-skill', 'public')).toBe(true);
        expect(broker.checkDataAccess('safe-skill', 'restricted')).toBe(false);
    });
});
