/**
 * DashboardToken — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { DashboardTokenHelper } from '../DashboardToken.js';

const SECRET = 'test-secret-key-for-gsep-dashboard';

describe('DashboardTokenHelper', () => {
    describe('create', () => {
        it('should create a base64url token with two parts', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
            });

            expect(token).toContain('.');
            const parts = token.split('.');
            expect(parts).toHaveLength(2);
            expect(parts[0].length).toBeGreaterThan(0);
            expect(parts[1].length).toBeGreaterThan(0);
        });

        it('should embed userId and genomeId in payload', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-123',
                genomeId: 'genome-456',
            });

            const payload = DashboardTokenHelper.verify(SECRET, token);
            expect(payload).not.toBeNull();
            expect(payload!.userId).toBe('user-123');
            expect(payload!.genomeId).toBe('genome-456');
        });

        it('should use default 24h expiration', () => {
            const before = Date.now();
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
            });
            const after = Date.now();

            const payload = DashboardTokenHelper.verify(SECRET, token);
            expect(payload).not.toBeNull();

            // iat should be within the creation window
            expect(payload!.iat).toBeGreaterThanOrEqual(before);
            expect(payload!.iat).toBeLessThanOrEqual(after);

            // exp should be ~24h from now
            const expectedExp = payload!.iat + 24 * 3600 * 1000;
            expect(payload!.exp).toBe(expectedExp);
        });

        it('should respect custom expiresIn', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
                expiresIn: '1h',
            });

            const payload = DashboardTokenHelper.verify(SECRET, token);
            expect(payload).not.toBeNull();
            expect(payload!.exp - payload!.iat).toBe(3_600_000); // 1 hour in ms
        });

        it('should generate unique jti for each token', () => {
            const token1 = DashboardTokenHelper.create(SECRET, { userId: 'u', genomeId: 'g' });
            const token2 = DashboardTokenHelper.create(SECRET, { userId: 'u', genomeId: 'g' });

            const p1 = DashboardTokenHelper.verify(SECRET, token1);
            const p2 = DashboardTokenHelper.verify(SECRET, token2);

            expect(p1!.jti).not.toBe(p2!.jti);
        });
    });

    describe('verify', () => {
        it('should return payload for valid token', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-ok',
                genomeId: 'genome-ok',
            });

            const payload = DashboardTokenHelper.verify(SECRET, token);
            expect(payload).not.toBeNull();
            expect(payload!.userId).toBe('user-ok');
        });

        it('should reject token with wrong secret', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
            });

            const payload = DashboardTokenHelper.verify('wrong-secret', token);
            expect(payload).toBeNull();
        });

        it('should reject tampered payload', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
            });

            // Tamper with the payload part
            const parts = token.split('.');
            const tampered = 'AAAA' + parts[0].slice(4) + '.' + parts[1];

            const payload = DashboardTokenHelper.verify(SECRET, tampered);
            expect(payload).toBeNull();
        });

        it('should reject expired token', () => {
            // Create token that expires in 1 second
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-1',
                genomeId: 'genome-1',
                expiresIn: '1s',
            });

            // Verify immediately — should pass
            const payloadNow = DashboardTokenHelper.verify(SECRET, token);
            expect(payloadNow).not.toBeNull();

            // Manually craft an expired token
            const payload = JSON.parse(
                Buffer.from(token.split('.')[0], 'base64url').toString('utf-8'),
            );
            payload.exp = Date.now() - 1000; // 1 second ago

            const { createHmac } = require('node:crypto');
            const expiredPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
            const expiredSig = createHmac('sha256', SECRET)
                .update(expiredPayload)
                .digest('base64url');
            const expiredToken = `${expiredPayload}.${expiredSig}`;

            const result = DashboardTokenHelper.verify(SECRET, expiredToken);
            expect(result).toBeNull();
        });

        it('should reject malformed tokens', () => {
            expect(DashboardTokenHelper.verify(SECRET, '')).toBeNull();
            expect(DashboardTokenHelper.verify(SECRET, 'onlyonepart')).toBeNull();
            expect(DashboardTokenHelper.verify(SECRET, 'a.b.c')).toBeNull();
            expect(DashboardTokenHelper.verify(SECRET, '...')).toBeNull();
        });
    });

    describe('duration parsing', () => {
        it('should support seconds', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'u', genomeId: 'g', expiresIn: '30s',
            });
            const p = DashboardTokenHelper.verify(SECRET, token);
            expect(p!.exp - p!.iat).toBe(30_000);
        });

        it('should support minutes', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'u', genomeId: 'g', expiresIn: '15m',
            });
            const p = DashboardTokenHelper.verify(SECRET, token);
            expect(p!.exp - p!.iat).toBe(15 * 60_000);
        });

        it('should support days', () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'u', genomeId: 'g', expiresIn: '7d',
            });
            const p = DashboardTokenHelper.verify(SECRET, token);
            expect(p!.exp - p!.iat).toBe(7 * 86_400_000);
        });

        it('should throw on invalid duration format', () => {
            expect(() =>
                DashboardTokenHelper.create(SECRET, {
                    userId: 'u', genomeId: 'g', expiresIn: 'invalid',
                }),
            ).toThrow('Invalid duration format');
        });
    });
});
