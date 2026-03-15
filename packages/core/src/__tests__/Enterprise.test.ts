/**
 * Enterprise Systems — Unit Tests
 * Covers: AuthManager, RateLimiter
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager } from '../enterprise/AuthManager.js';
import { RateLimiter } from '../enterprise/RateLimiter.js';

// ── AuthManager ──────────────────────────────────────────

describe('AuthManager', () => {
    let auth: AuthManager;

    beforeEach(() => {
        auth = new AuthManager();
    });

    describe('user CRUD', () => {
        it('creates a user with defaults', () => {
            const user = auth.createUser({ id: 'u1' });
            expect(user.id).toBe('u1');
            expect(user.roles).toBeDefined();
            expect(user.permissions).toBeDefined();
            expect(user.createdAt).toBeInstanceOf(Date);
        });

        it('creates a user with custom roles', () => {
            const user = auth.createUser({ id: 'u2', roles: ['admin'] });
            expect(user.roles).toContain('admin');
        });

        it('retrieves a user by ID', () => {
            auth.createUser({ id: 'u3' });
            expect(auth.getUser('u3')).toBeDefined();
            expect(auth.getUser('nonexistent')).toBeUndefined();
        });

        it('updates a user', () => {
            auth.createUser({ id: 'u4', email: 'old@test.com' });
            const updated = auth.updateUser('u4', { email: 'new@test.com' });
            expect(updated.email).toBe('new@test.com');
        });

        it('deletes a user', () => {
            auth.createUser({ id: 'u5' });
            expect(auth.deleteUser('u5')).toBe(true);
            expect(auth.getUser('u5')).toBeUndefined();
        });

        it('returns false when deleting nonexistent user', () => {
            expect(auth.deleteUser('nope')).toBe(false);
        });
    });

    describe('roles and permissions', () => {
        it('adds a role to user', () => {
            auth.createUser({ id: 'u6' });
            const user = auth.addRole('u6', 'developer');
            expect(user.roles).toContain('developer');
        });

        it('removes a role from user', () => {
            auth.createUser({ id: 'u7', roles: ['admin', 'developer'] });
            const user = auth.removeRole('u7', 'admin');
            expect(user.roles).not.toContain('admin');
            expect(user.roles).toContain('developer');
        });

        it('adds a permission to user', () => {
            auth.createUser({ id: 'u8' });
            const user = auth.addPermission('u8', 'genome:write');
            expect(user.permissions).toContain('genome:write');
        });

        it('removes a permission from user', () => {
            auth.createUser({ id: 'u9', permissions: ['genome:read', 'genome:write'] });
            const user = auth.removePermission('u9', 'genome:write');
            expect(user.permissions).not.toContain('genome:write');
            expect(user.permissions).toContain('genome:read');
        });
    });

    describe('authorization', () => {
        it('admin has all permissions', async () => {
            auth.createUser({ id: 'admin1', roles: ['admin'] });
            const hasRead = await auth.hasPermission('admin1', 'genome:read');
            expect(hasRead).toBe(true);
        });

        it('user without role has no extra permissions', async () => {
            auth.createUser({ id: 'basic1' });
            const hasPerm = await auth.hasPermission('basic1', 'admin:all');
            expect(hasPerm).toBe(false);
        });

        it('authorize throws for unauthorized user', async () => {
            auth.createUser({ id: 'noauth1' });
            await expect(auth.authorize('noauth1', 'admin:all')).rejects.toThrow();
        });

        it('authorize succeeds for permitted user', async () => {
            auth.createUser({ id: 'dev1', roles: ['developer'] });
            await expect(auth.authorize('dev1', 'genome:read')).resolves.not.toThrow();
        });
    });

    describe('context and stats', () => {
        it('creates auth context for existing user', () => {
            auth.createUser({ id: 'ctx1', roles: ['developer'] });
            const ctx = auth.createContext('ctx1');
            expect(ctx).not.toBeNull();
            expect(ctx!.userId).toBe('ctx1');
        });

        it('returns null context for nonexistent user', () => {
            expect(auth.createContext('nobody')).toBeNull();
        });

        it('getStats returns user counts', () => {
            auth.createUser({ id: 's1', roles: ['admin'] });
            auth.createUser({ id: 's2', roles: ['developer'] });
            const stats = auth.getStats();
            expect(stats.totalUsers).toBe(2);
        });
    });

    describe('multi-tenancy', () => {
        it('filters users by tenant', () => {
            const authMT = new AuthManager({ enableMultiTenancy: true });
            authMT.createUser({ id: 't1', tenantId: 'tenantA' });
            authMT.createUser({ id: 't2', tenantId: 'tenantA' });
            authMT.createUser({ id: 't3', tenantId: 'tenantB' });
            expect(authMT.getUsersByTenant('tenantA')).toHaveLength(2);
            expect(authMT.getUsersByTenant('tenantB')).toHaveLength(1);
        });

        it('filters users by role', () => {
            auth.createUser({ id: 'r1', roles: ['admin'] });
            auth.createUser({ id: 'r2', roles: ['developer'] });
            auth.createUser({ id: 'r3', roles: ['admin'] });
            expect(auth.getUsersByRole('admin')).toHaveLength(2);
        });
    });

    describe('policies', () => {
        it('adds and removes policies', () => {
            auth.addPolicy({
                name: 'test-policy',
                description: 'Test',
                effect: 'deny',
                permissions: ['admin:all'],
                conditions: {},
            });
            auth.removePolicy('test-policy');
        });
    });
});

// ── RateLimiter ──────────────────────────────────────────

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            maxRequests: 5,
            windowMs: 1000,
        });
    });

    describe('basic limiting', () => {
        it('allows requests within limit', async () => {
            const result = await limiter.check({ userId: 'u1' });
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });

        it('blocks after exceeding limit', async () => {
            for (let i = 0; i < 5; i++) {
                await limiter.check({ userId: 'u2' });
            }
            const result = await limiter.check({ userId: 'u2' });
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('different users have separate limits', async () => {
            for (let i = 0; i < 5; i++) {
                await limiter.check({ userId: 'userA' });
            }
            const resultA = await limiter.check({ userId: 'userA' });
            const resultB = await limiter.check({ userId: 'userB' });
            expect(resultA.allowed).toBe(false);
            expect(resultB.allowed).toBe(true);
        });
    });

    describe('reset', () => {
        it('resets a specific key', async () => {
            for (let i = 0; i < 5; i++) {
                await limiter.check({ userId: 'reset1' });
            }
            limiter.reset('user:reset1');
            const result = await limiter.check({ userId: 'reset1' });
            expect(result.allowed).toBe(true);
        });

        it('resetAll clears all keys', async () => {
            await limiter.check({ userId: 'ra1' });
            await limiter.check({ userId: 'ra2' });
            limiter.resetAll();
            const stats = limiter.getStats();
            expect(stats.totalKeys).toBe(0);
        });
    });

    describe('usage tracking', () => {
        it('tracks usage per key', async () => {
            await limiter.check({ userId: 'usage1' });
            await limiter.check({ userId: 'usage1' });
            const usage = limiter.getUsage('user:usage1');
            expect(usage.count).toBe(2);
            expect(usage.remaining).toBe(3);
        });
    });

    describe('stats', () => {
        it('reports algorithm and config', () => {
            const stats = limiter.getStats();
            expect(stats.algorithm).toBeDefined();
            expect(stats.config.maxRequests).toBe(5);
            expect(stats.config.windowMs).toBe(1000);
        });
    });

    describe('algorithms', () => {
        it('works with token-bucket algorithm', async () => {
            const tb = new RateLimiter({
                maxRequests: 3,
                windowMs: 1000,
                algorithm: 'token-bucket',
            });
            const r1 = await tb.check({ userId: 'tb1' });
            expect(r1.allowed).toBe(true);
        });

        it('works with fixed-window algorithm', async () => {
            const fw = new RateLimiter({
                maxRequests: 3,
                windowMs: 1000,
                algorithm: 'fixed-window',
            });
            const r1 = await fw.check({ userId: 'fw1' });
            expect(r1.allowed).toBe(true);
        });

        it('works with sliding-window algorithm (default)', async () => {
            const sw = new RateLimiter({
                maxRequests: 3,
                windowMs: 1000,
            });
            const r1 = await sw.check({ userId: 'sw1' });
            expect(r1.allowed).toBe(true);
        });
    });

    describe('result shape', () => {
        it('returns resetAt as Date', async () => {
            const result = await limiter.check({ userId: 'shape1' });
            expect(result.resetAt).toBeInstanceOf(Date);
        });

        it('returns retryAfter when blocked', async () => {
            for (let i = 0; i < 5; i++) {
                await limiter.check({ userId: 'retry1' });
            }
            const result = await limiter.check({ userId: 'retry1' });
            expect(result.allowed).toBe(false);
            if (result.retryAfter !== undefined) {
                expect(result.retryAfter).toBeGreaterThan(0);
            }
        });
    });
});
