/**
 * PIIRedactionEngine — Deterministic PII scanner for Genome Shield.
 *
 * Scans text for personally identifiable information and replaces
 * matches with placeholder tokens. The original values are stored
 * in an in-memory vault for optional re-hydration after LLM response.
 *
 * Performance target: <5ms per message.
 * Zero LLM calls — purely regex-based with validation (e.g., Luhn for credit cards).
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { randomBytes } from 'node:crypto';

// ─── Types ──────────────────────────────────────────────

export type PIICategory =
    | 'credit-card'
    | 'ssn'
    | 'email'
    | 'phone'
    | 'iban'
    | 'api-key'
    | 'ip-address'
    | 'passport'
    | 'national-id';

export interface PIIMatch {
    category: PIICategory;
    original: string;
    token: string;
    startIndex: number;
    endIndex: number;
}

export interface RedactionResult {
    redacted: string;
    matches: PIIMatch[];
    categories: PIICategory[];
}

interface PIIPattern {
    category: PIICategory;
    regex: RegExp;
    validate?: (match: string) => boolean;
}

// ─── Validation Helpers ─────────────────────────────────

function luhnCheck(num: string): boolean {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alternate) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alternate = !alternate;
    }
    return sum % 10 === 0;
}

function isValidIBAN(iban: string): boolean {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.length < 15 || cleaned.length > 34) return false;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;
    // Move first 4 chars to end, convert letters to numbers, mod 97
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55));
    let remainder = '';
    for (const digit of numeric) {
        remainder += digit;
        const num = parseInt(remainder, 10);
        remainder = String(num % 97);
    }
    return parseInt(remainder, 10) === 1;
}

// ─── PII Patterns ───────────────────────────────────────

const PII_PATTERNS: PIIPattern[] = [
    // ORDER MATTERS: More specific patterns FIRST to prevent overlap consumption.

    // API Keys — most specific prefixes, check first
    {
        category: 'api-key',
        regex: /\b(?:sk-ant-[A-Za-z0-9\-]{20,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,}|ghs_[A-Za-z0-9]{36,}|glpat-[A-Za-z0-9\-_]{20,}|xox[bpsr]-[A-Za-z0-9\-]{10,}|AKIA[A-Z0-9]{16}|ntn_[A-Za-z0-9]{40,}|whsec_[A-Za-z0-9]{20,})\b/g,
    },

    // IBAN — before passport/national-id (which could match substrings)
    {
        category: 'iban',
        regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b|\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g,
        validate: isValidIBAN,
    },

    // Credit Cards — Visa, MC, Amex, Discover (with optional separators)
    {
        category: 'credit-card',
        regex: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,
        validate: (match) => luhnCheck(match.replace(/[-\s]/g, '')),
    },

    // SSN (US format: XXX-XX-XXXX)
    {
        category: 'ssn',
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        validate: (match) => {
            const parts = match.split('-');
            const area = parseInt(parts[0], 10);
            return area > 0 && area !== 666 && area < 900;
        },
    },

    // Email addresses
    {
        category: 'email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    },

    // Phone numbers — require separator or + prefix to avoid matching numeric IDs
    {
        category: 'phone',
        regex: /\+\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b|\b\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
        validate: (match) => {
            const digits = match.replace(/\D/g, '');
            return digits.length >= 7 && digits.length <= 15;
        },
    },

    // IP Addresses (v4)
    {
        category: 'ip-address',
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
        validate: (match) => {
            return match !== '0.0.0.0' && match !== '127.0.0.1' && match !== '255.255.255.255';
        },
    },

    // German national ID (Personalausweis: 10 alphanumeric, specific charset)
    {
        category: 'national-id',
        regex: /\b[CFGHJKLMNPRTVWXYZ0-9]{10}\b/g,
    },

    // Passport numbers (common formats: 1-2 letters + 6-9 digits) — LAST (most generic)
    {
        category: 'passport',
        regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
    },
];

// ─── Engine ─────────────────────────────────────────────

/**
 * PII Redaction Engine for Genome Shield.
 *
 * Usage:
 * ```typescript
 * const engine = new PIIRedactionEngine();
 * const result = engine.redact('My card is 4111-1111-1111-1111');
 * // result.redacted = 'My card is [REDACTED:CC:a3f2]'
 * // result.matches[0].original = '4111-1111-1111-1111'
 *
 * // After LLM response, re-hydrate
 * const original = engine.rehydrate(result.redacted);
 * // original = 'My card is 4111-1111-1111-1111'
 * ```
 */
export class PIIRedactionEngine {
    private vault: Map<string, { original: string; category: PIICategory; timestamp: number }> = new Map();
    private enabledCategories: Set<PIICategory>;
    private vaultMaxSize = 10_000;
    private vaultTTLMs = 3_600_000; // 1 hour

    // Analytics
    private stats = {
        totalScanned: 0,
        totalRedacted: 0,
        byCategory: {} as Record<PIICategory, number>,
    };

    constructor(options?: {
        categories?: PIICategory[];
        vaultMaxSize?: number;
        vaultTTLMs?: number;
    }) {
        this.enabledCategories = options?.categories
            ? new Set(options.categories)
            : new Set(PII_PATTERNS.map(p => p.category));

        if (options?.vaultMaxSize) this.vaultMaxSize = options.vaultMaxSize;
        if (options?.vaultTTLMs) this.vaultTTLMs = options.vaultTTLMs;
    }

    /**
     * Scan and redact PII from text.
     */
    redact(text: string): RedactionResult {
        this.stats.totalScanned++;
        const matches: PIIMatch[] = [];
        let redacted = text;

        // Collect all matches first (to handle overlapping patterns)
        const allMatches: Array<PIIMatch & { pattern: PIIPattern }> = [];

        for (const pattern of PII_PATTERNS) {
            if (!this.enabledCategories.has(pattern.category)) continue;

            // Reset regex lastIndex for global patterns
            pattern.regex.lastIndex = 0;

            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const value = match[0];

                // Run validation if available
                if (pattern.validate && !pattern.validate(value)) continue;

                const token = this.generateToken(pattern.category);

                allMatches.push({
                    category: pattern.category,
                    original: value,
                    token,
                    startIndex: match.index,
                    endIndex: match.index + value.length,
                    pattern,
                });
            }
        }

        // Sort by start index descending (replace from end to preserve indices)
        allMatches.sort((a, b) => b.startIndex - a.startIndex);

        // Remove overlapping matches (keep the longest)
        const filtered = this.removeOverlaps(allMatches);

        // Apply redactions (from end to start)
        for (const m of filtered) {
            redacted = redacted.slice(0, m.startIndex) + m.token + redacted.slice(m.endIndex);

            // Store in vault for re-hydration
            this.vault.set(m.token, {
                original: m.original,
                category: m.category,
                timestamp: Date.now(),
            });

            // Update stats
            this.stats.totalRedacted++;
            this.stats.byCategory[m.category] = (this.stats.byCategory[m.category] || 0) + 1;

            matches.push({
                category: m.category,
                original: m.original,
                token: m.token,
                startIndex: m.startIndex,
                endIndex: m.endIndex,
            });
        }

        // Cleanup old vault entries
        this.cleanupVault();

        const categories = [...new Set(matches.map(m => m.category))];

        return { redacted, matches: matches.reverse(), categories };
    }

    /**
     * Re-hydrate redacted text with original PII values.
     * Call after LLM response to restore data for user display.
     */
    rehydrate(text: string): string {
        let result = text;
        for (const [token, entry] of this.vault) {
            if (result.includes(token)) {
                result = result.replaceAll(token, entry.original);
            }
        }
        return result;
    }

    /**
     * Check if text contains any PII (without redacting).
     */
    scan(text: string): { hasPII: boolean; categories: PIICategory[]; count: number } {
        const result = this.redact(text);
        // Don't store in vault for scan-only
        for (const match of result.matches) {
            this.vault.delete(match.token);
        }
        return {
            hasPII: result.matches.length > 0,
            categories: result.categories,
            count: result.matches.length,
        };
    }

    /**
     * Get analytics.
     */
    getStats(): typeof this.stats {
        return { ...this.stats };
    }

    /**
     * Clear the vault (e.g., on session end).
     */
    clearVault(): void {
        this.vault.clear();
    }

    /**
     * Get vault size.
     */
    getVaultSize(): number {
        return this.vault.size;
    }

    // ─── Internal ───────────────────────────────────────

    private generateToken(category: PIICategory): string {
        const id = randomBytes(2).toString('hex');
        const short = this.categoryShort(category);
        return `[REDACTED:${short}:${id}]`;
    }

    private categoryShort(category: PIICategory): string {
        const map: Record<PIICategory, string> = {
            'credit-card': 'CC',
            'ssn': 'SSN',
            'email': 'EMAIL',
            'phone': 'PHONE',
            'iban': 'IBAN',
            'api-key': 'KEY',
            'ip-address': 'IP',
            'passport': 'PASS',
            'national-id': 'NID',
        };
        return map[category] || 'PII';
    }

    private removeOverlaps(matches: PIIMatch[]): PIIMatch[] {
        const result: PIIMatch[] = [];
        let lastEnd = Infinity;

        for (const m of matches) {
            // matches are sorted by startIndex descending
            if (m.endIndex <= lastEnd) {
                result.push(m);
                lastEnd = m.startIndex;
            }
        }

        return result;
    }

    private cleanupVault(): void {
        if (this.vault.size <= this.vaultMaxSize) return;

        const now = Date.now();
        for (const [token, entry] of this.vault) {
            if (now - entry.timestamp > this.vaultTTLMs) {
                this.vault.delete(token);
            }
        }

        // If still too large, remove oldest
        if (this.vault.size > this.vaultMaxSize) {
            const entries = [...this.vault.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = entries.slice(0, this.vault.size - this.vaultMaxSize);
            for (const [token] of toRemove) {
                this.vault.delete(token);
            }
        }
    }
}
