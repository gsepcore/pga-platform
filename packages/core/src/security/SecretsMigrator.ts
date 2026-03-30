/**
 * SecretsMigrator — Auto-migrate plaintext secrets to Keychain.
 *
 * Scans .env files and config JSON for credentials,
 * migrates them to macOS Keychain, and optionally deletes originals.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { readFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { KeychainAdapter } from './KeychainAdapter.js';
import { EncryptedConfigStore } from './EncryptedConfigStore.js';

export interface MigrationResult {
    migrated: string[];
    skipped: string[];
    errors: Array<{ key: string; error: string }>;
    sourcesProcessed: string[];
    backupPath?: string;
}

/** Patterns that indicate a value is a secret (not a regular config value). */
const SECRET_PATTERNS = [
    /^sk-/,                    // OpenAI
    /^sk-ant-/,                // Anthropic
    /^ghp_/,                   // GitHub
    /^xox[bpsr]-/,             // Slack
    /^AKIA/,                   // AWS
    /^ghs_/,                   // GitHub App
    /^glpat-/,                 // GitLab
    /^ntn_/,                   // Notion
    /^whsec_/,                 // Webhook secret
];

/** Keys that are always considered secrets regardless of value. */
const SECRET_KEY_PATTERNS = [
    /API_KEY$/i,
    /SECRET$/i,
    /TOKEN$/i,
    /PASSWORD$/i,
    /PRIVATE_KEY$/i,
    /BOT_TOKEN$/i,
    /WEBHOOK_SECRET$/i,
    /AUTH_TOKEN$/i,
    /ACCESS_KEY$/i,
];

/**
 * Migrates plaintext secrets to Keychain + EncryptedConfigStore.
 *
 * Usage:
 * ```typescript
 * const migrator = new SecretsMigrator(keychain, encryptedStore);
 * const result = await migrator.migrate({
 *   scanPaths: ['~/Genome/.env', '~/.genome/.env'],
 *   deleteOriginals: true,
 * });
 * console.log(`Migrated ${result.migrated.length} secrets`);
 * ```
 */
export class SecretsMigrator {
    private keychain: KeychainAdapter;
    private configStore: EncryptedConfigStore;

    constructor(keychain: KeychainAdapter, configStore: EncryptedConfigStore) {
        this.keychain = keychain;
        this.configStore = configStore;
    }

    /**
     * Run the migration.
     */
    async migrate(options?: {
        scanPaths?: string[];
        deleteOriginals?: boolean;
        dryRun?: boolean;
    }): Promise<MigrationResult> {
        const scanPaths = options?.scanPaths ?? this.defaultScanPaths();
        const deleteOriginals = options?.deleteOriginals ?? false;
        const dryRun = options?.dryRun ?? false;

        const result: MigrationResult = {
            migrated: [],
            skipped: [],
            errors: [],
            sourcesProcessed: [],
        };

        for (const filePath of scanPaths) {
            const resolved = filePath.replace(/^~/, homedir());
            if (!existsSync(resolved)) continue;

            result.sourcesProcessed.push(filePath);

            try {
                const entries = await this.parseFile(resolved);

                for (const [key, value] of Object.entries(entries)) {
                    if (!value || value.trim() === '') {
                        result.skipped.push(key);
                        continue;
                    }

                    const isSecret = this.isSecret(key, value);

                    if (isSecret) {
                        if (!dryRun) {
                            // Secrets go to Keychain
                            try {
                                await this.keychain.set(key, value);
                                result.migrated.push(key);
                            } catch (err) {
                                result.errors.push({ key, error: (err as Error).message });
                            }
                        } else {
                            result.migrated.push(key);
                        }
                    } else {
                        if (!dryRun) {
                            // Non-secrets go to encrypted config
                            try {
                                await this.configStore.set(key, value);
                                result.migrated.push(key);
                            } catch (err) {
                                result.errors.push({ key, error: (err as Error).message });
                            }
                        } else {
                            result.migrated.push(key);
                        }
                    }
                }

                // Backup and optionally delete original
                if (!dryRun && deleteOriginals && result.migrated.length > 0) {
                    const backupPath = `${resolved}.backup.${Date.now()}`;
                    await rename(resolved, backupPath);
                    result.backupPath = backupPath;
                }
            } catch (err) {
                result.errors.push({ key: filePath, error: (err as Error).message });
            }
        }

        return result;
    }

    /**
     * Check if migration is needed (any plaintext .env files exist).
     */
    async needsMigration(): Promise<boolean> {
        for (const filePath of this.defaultScanPaths()) {
            const resolved = filePath.replace(/^~/, homedir());
            if (existsSync(resolved)) return true;
        }
        return false;
    }

    // ─── Internal ───────────────────────────────────────

    private defaultScanPaths(): string[] {
        return [
            '~/.genome/.env',
            '~/Genome/.env',
            './.env',
        ];
    }

    private async parseFile(filePath: string): Promise<Record<string, string>> {
        const content = await readFile(filePath, 'utf-8');
        const entries: Record<string, string> = {};

        if (filePath.endsWith('.json')) {
            // JSON config file
            try {
                const json = JSON.parse(content);
                this.flattenJSON(json, '', entries);
            } catch {
                // Not valid JSON, skip
            }
        } else {
            // .env format
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;

                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1) continue;

                const key = trimmed.slice(0, eqIdx).trim();
                let value = trimmed.slice(eqIdx + 1).trim();

                // Remove surrounding quotes
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                if (key && value) {
                    entries[key] = value;
                }
            }
        }

        return entries;
    }

    private flattenJSON(obj: unknown, prefix: string, result: Record<string, string>): void {
        if (typeof obj === 'string') {
            result[prefix] = obj;
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'string') {
                    result[fullKey] = value;
                } else if (typeof value === 'object' && value !== null) {
                    this.flattenJSON(value, fullKey, result);
                }
            }
        }
    }

    private isSecret(key: string, value: string): boolean {
        // Check if the key name matches secret patterns
        if (SECRET_KEY_PATTERNS.some(p => p.test(key))) return true;

        // Check if the value looks like a secret
        if (SECRET_PATTERNS.some(p => p.test(value))) return true;

        // Long random-looking strings (>20 chars, alphanumeric + special)
        if (value.length > 20 && /^[A-Za-z0-9_\-+/=.]+$/.test(value)) return true;

        return false;
    }
}
