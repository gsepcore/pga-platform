/**
 * MFAProvider — Multi-Factor Authentication for Genome Shield Enterprise.
 *
 * TOTP (RFC 6238) compatible with Google Authenticator, Authy, 1Password.
 * Recovery codes for account recovery.
 * Zero dependencies — uses node:crypto HMAC-SHA1.
 *
 * @module security/enterprise
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { randomBytes, createHmac } from 'node:crypto';
import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export interface MFASetup {
    /** Base32-encoded secret for TOTP apps */
    secret: string;
    /** otpauth:// URI for QR code generation */
    uri: string;
    /** 10 recovery codes (one-time use) */
    recoveryCodes: string[];
}

export interface MFAVerifyResult {
    valid: boolean;
    method: 'totp' | 'recovery';
    reason?: string;
}

export interface MFAUserState {
    userId: string;
    enabled: boolean;
    secret: string;
    recoveryCodes: string[];
    usedRecoveryCodes: string[];
    failedAttempts: number;
    lockedUntil?: Date;
    lastVerifiedAt?: Date;
}

// ─── TOTP Constants ─────────────────────────────────────

const TOTP_PERIOD = 30;          // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;           // allow ±1 period (30s tolerance)
const SECRET_BYTES = 20;         // 160-bit secret
const RECOVERY_CODE_COUNT = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Base32 ─────────────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(buffer: Buffer): string {
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let result = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        result += BASE32_CHARS[parseInt(chunk, 2)];
    }
    return result;
}

function fromBase32(encoded: string): Buffer {
    let bits = '';
    for (const char of encoded.toUpperCase()) {
        const idx = BASE32_CHARS.indexOf(char);
        if (idx === -1) continue;
        bits += idx.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

// ─── TOTP Core ──────────────────────────────────────────

function generateTOTP(secret: Buffer, time: number): string {
    const counter = Math.floor(time / TOTP_PERIOD);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(0, 0);
    counterBuffer.writeUInt32BE(counter, 4);

    const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
    ) % Math.pow(10, TOTP_DIGITS);

    return code.toString().padStart(TOTP_DIGITS, '0');
}

// ─── Provider ───────────────────────────────────────────

/**
 * Multi-Factor Authentication provider.
 *
 * Usage:
 * ```typescript
 * const mfa = new MFAProvider(eventBus);
 *
 * // Setup MFA for a user
 * const setup = mfa.setup('user-123', 'Genome Agent');
 * // Show setup.uri as QR code, save setup.recoveryCodes
 *
 * // Verify on login
 * const result = mfa.verify('user-123', '123456');
 * if (!result.valid) throw new Error('MFA failed');
 * ```
 */
export class MFAProvider {
    private eventBus: SecurityEventBus;
    private users: Map<string, MFAUserState> = new Map();

    constructor(eventBus: SecurityEventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Setup MFA for a user. Returns secret + recovery codes.
     */
    setup(userId: string, issuer = 'Genome'): MFASetup {
        const secretBuffer = randomBytes(SECRET_BYTES);
        const secret = toBase32(secretBuffer);
        const recoveryCodes = this.generateRecoveryCodes();

        const state: MFAUserState = {
            userId,
            enabled: true,
            secret,
            recoveryCodes,
            usedRecoveryCodes: [],
            failedAttempts: 0,
        };

        this.users.set(userId, state);

        const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

        this.eventBus.emit({
            type: 'security:audit-entry',
            timestamp: new Date(),
            layer: 3,
            decision: 'info',
            actor: { userId },
            resource: { type: 'mfa', id: 'setup', detail: 'MFA enabled' },
            severity: 'info',
        });

        return { secret, uri, recoveryCodes };
    }

    /**
     * Verify a TOTP code or recovery code.
     */
    verify(userId: string, code: string): MFAVerifyResult {
        const state = this.users.get(userId);

        if (!state || !state.enabled) {
            return { valid: false, method: 'totp', reason: 'MFA not enabled for this user' };
        }

        // Check lockout
        if (state.lockedUntil && new Date() < state.lockedUntil) {
            const remaining = Math.ceil((state.lockedUntil.getTime() - Date.now()) / 60000);
            return { valid: false, method: 'totp', reason: `Account locked. Try again in ${remaining} minutes.` };
        }

        // Try TOTP first
        if (code.length === TOTP_DIGITS && /^\d+$/.test(code)) {
            const secretBuffer = fromBase32(state.secret);
            const now = Math.floor(Date.now() / 1000);

            for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
                const expected = generateTOTP(secretBuffer, now + i * TOTP_PERIOD);
                if (this.timingSafeEqual(code, expected)) {
                    state.failedAttempts = 0;
                    state.lockedUntil = undefined;
                    state.lastVerifiedAt = new Date();

                    this.eventBus.emitAllow('security:audit-entry' as never, 3, {
                        type: 'mfa', id: 'totp-verify', detail: 'Success',
                    }, { userId });

                    return { valid: true, method: 'totp' };
                }
            }
        }

        // Try recovery code
        if (code.length >= 8) {
            const normalizedCode = code.replace(/-/g, '').toUpperCase();
            const idx = state.recoveryCodes.indexOf(normalizedCode);

            if (idx !== -1) {
                state.recoveryCodes.splice(idx, 1);
                state.usedRecoveryCodes.push(normalizedCode);
                state.failedAttempts = 0;
                state.lockedUntil = undefined;
                state.lastVerifiedAt = new Date();

                this.eventBus.emit({
                    type: 'security:audit-entry',
                    timestamp: new Date(),
                    layer: 3,
                    decision: 'info',
                    actor: { userId },
                    resource: { type: 'mfa', id: 'recovery-code', detail: `Used. ${state.recoveryCodes.length} remaining.` },
                    severity: 'warning',
                });

                return { valid: true, method: 'recovery' };
            }
        }

        // Failed attempt
        state.failedAttempts++;
        if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            state.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            this.eventBus.emitDeny('security:audit-entry' as never, 3, {
                type: 'mfa', id: 'lockout', detail: `${MAX_FAILED_ATTEMPTS} failed attempts — locked for 15 minutes`,
            }, 'high', { userId });
        }

        return { valid: false, method: 'totp', reason: 'Invalid code' };
    }

    /**
     * Disable MFA for a user.
     */
    disable(userId: string): boolean {
        const state = this.users.get(userId);
        if (!state) return false;
        state.enabled = false;
        return true;
    }

    /**
     * Check if MFA is enabled for a user.
     */
    isEnabled(userId: string): boolean {
        return this.users.get(userId)?.enabled ?? false;
    }

    /**
     * Get remaining recovery codes count.
     */
    getRemainingRecoveryCodes(userId: string): number {
        return this.users.get(userId)?.recoveryCodes.length ?? 0;
    }

    /**
     * Regenerate recovery codes (invalidates old ones).
     */
    regenerateRecoveryCodes(userId: string): string[] {
        const state = this.users.get(userId);
        if (!state) throw new Error('[MFA] User not found');
        state.recoveryCodes = this.generateRecoveryCodes();
        state.usedRecoveryCodes = [];
        return state.recoveryCodes;
    }

    // ─── Internal ───────────────────────────────────────

    private generateRecoveryCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
            const code = randomBytes(5).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    private timingSafeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
}
