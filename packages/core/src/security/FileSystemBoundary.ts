/**
 * FileSystemBoundary — Path-based access control for Genome Shield.
 *
 * Validates every filesystem access against allowed/denied paths.
 * Prevents symlink escapes and path traversal attacks.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { realpathSync, existsSync } from 'node:fs';
import { resolve, normalize, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export type FSAccess = 'read' | 'write' | 'delete';

export interface FSCheckResult {
    allowed: boolean;
    reason?: string;
    resolvedPath: string;
}

export interface FSBoundaryConfig {
    allowedPaths: string[];
    deniedPaths: string[];
    /** Allow access to everything under home (default: false) */
    allowHomeDir: boolean;
}

// ─── Boundary ───────────────────────────────────────────

/**
 * Filesystem access control.
 *
 * Usage:
 * ```typescript
 * const boundary = new FileSystemBoundary(eventBus, {
 *   allowedPaths: ['~/Documents/Genome', '~/.genome'],
 *   deniedPaths: ['~/.ssh', '~/.gnupg'],
 * });
 *
 * const check = boundary.check('/Users/luis/.ssh/id_rsa', 'read');
 * // check.allowed = false
 * // check.reason = 'Path is in denied list: ~/.ssh'
 * ```
 */
export class FileSystemBoundary {
    private eventBus: SecurityEventBus;
    private allowedPaths: string[];
    private deniedPaths: string[];
    private allowHomeDir: boolean;
    private home: string;
    private stats = { totalChecks: 0, allowed: 0, denied: 0 };

    constructor(eventBus: SecurityEventBus, config: Partial<FSBoundaryConfig> = {}) {
        this.eventBus = eventBus;
        this.home = homedir();
        this.allowHomeDir = config.allowHomeDir ?? false;
        this.allowedPaths = (config.allowedPaths ?? []).map(p => this.expandPath(p));
        this.deniedPaths = (config.deniedPaths ?? []).map(p => this.expandPath(p));
    }

    /**
     * Check if a path is allowed for the given access type.
     */
    check(targetPath: string, access: FSAccess, skillId?: string): FSCheckResult {
        this.stats.totalChecks++;

        const expanded = this.expandPath(targetPath);
        const normalized = normalize(expanded);

        // Step 1: Path traversal detection
        if (this.hasTraversal(targetPath)) {
            this.stats.denied++;
            this.emitDeny(normalized, access, 'Path traversal detected', skillId);
            return { allowed: false, reason: 'Path traversal detected (../ sequences)', resolvedPath: normalized };
        }

        // Step 2: Resolve symlinks if path exists
        let resolvedPath = normalized;
        try {
            if (existsSync(normalized)) {
                resolvedPath = realpathSync(normalized);
            }
        } catch {
            // If we can't resolve, use the normalized path
        }

        // Step 3: Check denied paths FIRST (deny takes priority)
        for (const denied of this.deniedPaths) {
            if (this.isUnderPath(resolvedPath, denied)) {
                this.stats.denied++;
                this.emitDeny(resolvedPath, access, `Path is in denied list: ${denied}`, skillId);
                return { allowed: false, reason: `Access denied: path is under ${denied}`, resolvedPath };
            }
        }

        // Step 4: Check allowed paths
        if (this.allowedPaths.length > 0) {
            const isAllowed = this.allowedPaths.some(allowed => this.isUnderPath(resolvedPath, allowed));
            if (!isAllowed && !this.allowHomeDir) {
                this.stats.denied++;
                this.emitDeny(resolvedPath, access, 'Path not in allowed list', skillId);
                return { allowed: false, reason: 'Access denied: path not in allowed list', resolvedPath };
            }
            if (!isAllowed && this.allowHomeDir && !this.isUnderPath(resolvedPath, this.home)) {
                this.stats.denied++;
                this.emitDeny(resolvedPath, access, 'Path outside home directory', skillId);
                return { allowed: false, reason: 'Access denied: path outside home directory', resolvedPath };
            }
        }

        // Step 5: If allowHomeDir is set, verify path is under home
        if (this.allowHomeDir && !this.isUnderPath(resolvedPath, this.home) && this.allowedPaths.length === 0) {
            this.stats.denied++;
            this.emitDeny(resolvedPath, access, 'Path outside home directory', skillId);
            return { allowed: false, reason: 'Access denied: path outside home directory', resolvedPath };
        }

        this.stats.allowed++;
        this.eventBus.emitAllow('security:fs-allowed', 5, {
            type: `fs:${access}`,
            id: resolvedPath,
        }, { skillId });

        return { allowed: true, resolvedPath };
    }

    /**
     * Quick check — returns boolean only.
     */
    isAllowed(targetPath: string, access: FSAccess): boolean {
        return this.check(targetPath, access).allowed;
    }

    /**
     * Get stats.
     */
    getStats() {
        return { ...this.stats };
    }

    // ─── Internal ───────────────────────────────────────

    private expandPath(p: string): string {
        if (p.startsWith('~/') || p === '~') {
            return resolve(this.home, p.slice(2) || '');
        }
        if (!isAbsolute(p)) {
            return resolve(p);
        }
        return p;
    }

    private isUnderPath(target: string, base: string): boolean {
        const rel = relative(base, target);
        return !rel.startsWith('..') && !isAbsolute(rel);
    }

    private hasTraversal(p: string): boolean {
        const normalized = normalize(p);
        return p.includes('../') && normalized !== resolve(p);
    }

    private emitDeny(path: string, access: FSAccess, reason: string, skillId?: string): void {
        this.eventBus.emitDeny(
            'security:fs-blocked',
            5,
            { type: `fs:${access}`, id: path, detail: reason },
            'warning',
            { skillId },
        );
    }
}
