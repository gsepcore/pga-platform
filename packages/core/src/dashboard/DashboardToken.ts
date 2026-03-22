/**
 * Dashboard Token — HMAC-SHA256 per-user authentication
 *
 * Zero dependencies (uses node:crypto).
 * Developers use this to generate scoped tokens for their users.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import { createHmac, randomBytes } from 'node:crypto';

// ─── Token Payload ───────────────────────────────────────

export interface DashboardTokenPayload {
    /** User ID (developer's user system) */
    userId: string;
    /** Genome ID to scope the dashboard */
    genomeId: string;
    /** Issued at (epoch ms) */
    iat: number;
    /** Expires at (epoch ms) */
    exp: number;
    /** Unique token ID */
    jti: string;
}

// ─── Duration Parsing ────────────────────────────────────

function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}. Use e.g. "24h", "7d", "30m".`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000,
    };

    return value * multipliers[unit];
}

// ─── Token Helper ────────────────────────────────────────

export class DashboardTokenHelper {
    /**
     * Create a signed dashboard token
     *
     * @param secret - HMAC secret (minimum 16 chars recommended)
     * @param options - Token options
     * @returns Base64url-encoded signed token
     */
    static create(secret: string, options: {
        userId: string;
        genomeId: string;
        expiresIn?: string; // e.g. "24h", "7d", "30m"
    }): string {
        const now = Date.now();
        const expiresIn = options.expiresIn ?? '24h';

        const payload: DashboardTokenPayload = {
            userId: options.userId,
            genomeId: options.genomeId,
            iat: now,
            exp: now + parseDuration(expiresIn),
            jti: randomBytes(8).toString('hex'),
        };

        const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = createHmac('sha256', secret)
            .update(payloadStr)
            .digest('base64url');

        return `${payloadStr}.${signature}`;
    }

    /**
     * Verify and decode a dashboard token
     *
     * @param secret - HMAC secret (must match the one used to create)
     * @param token - The token to verify
     * @returns Decoded payload or null if invalid/expired
     */
    static verify(secret: string, token: string): DashboardTokenPayload | null {
        const parts = token.split('.');
        if (parts.length !== 2) return null;

        const [payloadStr, signature] = parts;

        // Verify signature
        const expectedSig = createHmac('sha256', secret)
            .update(payloadStr)
            .digest('base64url');

        if (signature !== expectedSig) return null;

        // Decode payload
        try {
            const payload = JSON.parse(
                Buffer.from(payloadStr, 'base64url').toString('utf-8'),
            ) as DashboardTokenPayload;

            // Check expiry
            if (payload.exp < Date.now()) return null;

            return payload;
        } catch {
            return null;
        }
    }
}
