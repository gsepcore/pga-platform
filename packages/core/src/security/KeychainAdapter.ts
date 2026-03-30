/**
 * KeychainAdapter — macOS Keychain integration for Genome Shield.
 *
 * Stores secrets in macOS Keychain using the `security` CLI tool.
 * Zero npm dependencies — uses macOS built-in tools only.
 *
 * Service format: com.genome.agent.<key-name>
 * Account: genome-agent
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SERVICE_PREFIX = 'com.genome.agent';
const ACCOUNT = 'genome-agent';
const SECURITY_BIN = '/usr/bin/security';

export class KeychainAdapter {
    private servicePrefix: string;
    private account: string;

    constructor(options?: { servicePrefix?: string; account?: string }) {
        this.servicePrefix = options?.servicePrefix ?? SERVICE_PREFIX;
        this.account = options?.account ?? ACCOUNT;
    }

    /**
     * Get a secret from Keychain.
     * Returns null if not found.
     */
    async get(key: string): Promise<string | null> {
        const service = this.serviceFor(key);
        try {
            const { stdout } = await execFileAsync(SECURITY_BIN, [
                'find-generic-password',
                '-s', service,
                '-a', this.account,
                '-w', // output password only
            ]);
            return stdout.trim();
        } catch {
            // Exit code 44 = item not found, others = keychain error
            return null;
        }
    }

    /**
     * Store a secret in Keychain. Overwrites if exists.
     */
    async set(key: string, value: string): Promise<void> {
        const service = this.serviceFor(key);

        // Delete existing entry first (ignore error if not found)
        await this.delete(key).catch(() => {});

        await execFileAsync(SECURITY_BIN, [
            'add-generic-password',
            '-s', service,
            '-a', this.account,
            '-w', value,
            '-U', // update if exists
        ]);
    }

    /**
     * Delete a secret from Keychain.
     */
    async delete(key: string): Promise<boolean> {
        const service = this.serviceFor(key);
        try {
            await execFileAsync(SECURITY_BIN, [
                'delete-generic-password',
                '-s', service,
                '-a', this.account,
            ]);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if a key exists in Keychain.
     */
    async has(key: string): Promise<boolean> {
        const value = await this.get(key);
        return value !== null;
    }

    /**
     * List all keys stored by Genome in Keychain.
     * Returns key names (without the service prefix).
     */
    async list(): Promise<string[]> {
        try {
            const { stdout } = await execFileAsync(SECURITY_BIN, [
                'dump-keychain',
            ]);

            const keys: string[] = [];
            const serviceRegex = new RegExp(
                `"svce"<blob>="(${this.escapeRegex(this.servicePrefix)}\\.[^"]+)"`,
                'g',
            );

            let match;
            while ((match = serviceRegex.exec(stdout)) !== null) {
                const fullService = match[1];
                const key = fullService.slice(this.servicePrefix.length + 1);
                if (key && !keys.includes(key)) {
                    keys.push(key);
                }
            }

            return keys.sort();
        } catch {
            return [];
        }
    }

    /**
     * Store a binary value as base64 in Keychain.
     */
    async setBuffer(key: string, value: Buffer): Promise<void> {
        await this.set(key, value.toString('base64'));
    }

    /**
     * Get a binary value (stored as base64) from Keychain.
     */
    async getBuffer(key: string): Promise<Buffer | null> {
        const value = await this.get(key);
        if (value === null) return null;
        return Buffer.from(value, 'base64');
    }

    /**
     * Check if the Keychain is accessible (not locked).
     */
    async isAvailable(): Promise<boolean> {
        try {
            await execFileAsync(SECURITY_BIN, ['show-keychain-info']);
            return true;
        } catch {
            return false;
        }
    }

    // ─── Internal ───────────────────────────────────────

    private serviceFor(key: string): string {
        return `${this.servicePrefix}.${key}`;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
