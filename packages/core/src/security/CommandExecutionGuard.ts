/**
 * CommandExecutionGuard — Safe command execution for Genome Shield.
 *
 * Replaces shell:true with execFile + argument arrays.
 * Allowlist/blocklist per security profile.
 * Every command logged to SecurityEventBus.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { execFile, type ExecFileException } from 'node:child_process';
import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export type ExecDecision = 'allow' | 'deny' | 'ask';

export interface ExecRequest {
    command: string;
    args: string[];
    cwd?: string;
    userId?: string;
    skillId?: string;
}

export interface ExecResult {
    decision: ExecDecision;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    denyReason?: string;
    durationMs?: number;
}

export interface ExecGuardConfig {
    /** Safe binaries always allowed */
    allowlist: string[];
    /** Commands always blocked (regardless of profile) */
    blocklist: Array<{ command: string; argsPattern?: RegExp }>;
    /** Patterns that require user confirmation */
    destructivePatterns: RegExp[];
    /** Callback for user approval (if not provided, destructive = deny) */
    onApprovalRequired?: (req: ExecRequest) => Promise<boolean>;
}

// ─── Default Lists ──────────────────────────────────────

const DEFAULT_ALLOWLIST = [
    'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc', 'sort', 'uniq',
    'echo', 'printf', 'date', 'whoami', 'hostname', 'uname', 'pwd',
    'git', 'node', 'python', 'python3', 'pip', 'npm', 'npx', 'pnpm',
    'jq', 'yq', 'curl', 'wget', 'dig', 'nslookup', 'ping',
    'docker', 'brew', 'which', 'file', 'stat', 'du', 'df',
    'tar', 'zip', 'unzip', 'gzip', 'gunzip',
    'sed', 'awk', 'cut', 'tr', 'tee', 'diff', 'patch',
    'rm', 'mkdir', 'touch', 'cp', 'mv', 'ln',
    'sudo', 'chmod', 'chown',
    'open', 'pbcopy', 'pbpaste',
    'code', 'vim', 'nano',
];

const DEFAULT_BLOCKLIST: ExecGuardConfig['blocklist'] = [
    { command: 'rm', argsPattern: /-[A-Za-z]*r[A-Za-z]*f|--force.*--recursive|--recursive.*--force/ },
    { command: 'chmod', argsPattern: /777/ },
    { command: 'sudo', argsPattern: /rm|dd|mkfs|fdisk/ },
    { command: 'dd' },
    { command: 'mkfs' },
    { command: 'fdisk' },
    { command: 'diskutil', argsPattern: /erase|partition/ },
    { command: 'launchctl', argsPattern: /unload|remove/ },
    { command: 'defaults', argsPattern: /delete|write/ },
    { command: 'killall' },
    { command: 'pkill', argsPattern: /-9/ },
    { command: 'eval' },
    { command: 'sh', argsPattern: /-c/ },
    { command: 'bash', argsPattern: /-c/ },
    { command: 'zsh', argsPattern: /-c/ },
];

const DEFAULT_DESTRUCTIVE_PATTERNS = [
    /\brm\b/,
    /\bsudo\b/,
    /\bchmod\b/,
    /\bchown\b/,
    /\bmv\s+\//,         // mv to root
    />\s*\/dev\/null/,   // redirect to /dev/null
    /\|\s*sh\b/,         // pipe to shell
    /\|\s*bash\b/,
    /--force/,
    /--hard/,
];

// ─── Guard ──────────────────────────────────────────────

/**
 * Safe command execution guard.
 *
 * Usage:
 * ```typescript
 * const guard = new CommandExecutionGuard(eventBus, {
 *   allowlist: DEFAULT_ALLOWLIST,
 * });
 *
 * const result = await guard.execute({
 *   command: 'ls',
 *   args: ['-la', '/tmp'],
 * });
 * ```
 */
export class CommandExecutionGuard {
    private eventBus: SecurityEventBus;
    private config: ExecGuardConfig;
    private stats = {
        totalRequests: 0,
        allowed: 0,
        denied: 0,
        asked: 0,
    };

    constructor(eventBus: SecurityEventBus, config?: Partial<ExecGuardConfig>) {
        this.eventBus = eventBus;
        this.config = {
            allowlist: config?.allowlist ?? DEFAULT_ALLOWLIST,
            blocklist: config?.blocklist ?? DEFAULT_BLOCKLIST,
            destructivePatterns: config?.destructivePatterns ?? DEFAULT_DESTRUCTIVE_PATTERNS,
            onApprovalRequired: config?.onApprovalRequired,
        };
    }

    /**
     * Evaluate whether a command should be allowed.
     */
    evaluate(request: ExecRequest): ExecDecision {
        const { command, args } = request;
        const fullCommand = [command, ...args].join(' ');

        // Step 1: Check blocklist (always deny)
        for (const blocked of this.config.blocklist) {
            if (command === blocked.command || command.endsWith(`/${blocked.command}`)) {
                if (!blocked.argsPattern || blocked.argsPattern.test(fullCommand)) {
                    return 'deny';
                }
            }
        }

        // Step 2: Check if command is in allowlist
        const basename = command.split('/').pop() ?? command;
        const isAllowed = this.config.allowlist.includes(basename);

        if (!isAllowed) {
            return 'deny';
        }

        // Step 3: Check destructive patterns (require approval)
        for (const pattern of this.config.destructivePatterns) {
            if (pattern.test(fullCommand)) {
                return 'ask';
            }
        }

        return 'allow';
    }

    /**
     * Execute a command through the security guard.
     */
    async execute(request: ExecRequest): Promise<ExecResult> {
        this.stats.totalRequests++;
        const decision = this.evaluate(request);

        if (decision === 'deny') {
            this.stats.denied++;
            this.eventBus.emitDeny(
                'security:exec-blocked',
                5,
                { type: 'command', id: request.command, detail: request.args.join(' ') },
                'warning',
                { userId: request.userId, skillId: request.skillId },
            );
            return { decision: 'deny', denyReason: `Command "${request.command}" is not allowed by security policy.` };
        }

        if (decision === 'ask') {
            this.stats.asked++;
            if (this.config.onApprovalRequired) {
                const approved = await this.config.onApprovalRequired(request);
                if (!approved) {
                    this.stats.denied++;
                    this.eventBus.emitDeny(
                        'security:exec-blocked',
                        5,
                        { type: 'command', id: request.command, detail: 'User denied destructive command' },
                        'warning',
                        { userId: request.userId, skillId: request.skillId },
                    );
                    return { decision: 'deny', denyReason: 'User denied the command.' };
                }
            } else {
                // No approval handler — deny by default (fail-secure)
                this.stats.denied++;
                return { decision: 'deny', denyReason: 'Destructive command requires approval but no handler configured.' };
            }
        }

        // Execute safely with execFile (no shell)
        this.stats.allowed++;
        const startTime = Date.now();

        return new Promise<ExecResult>((resolve) => {
            execFile(
                request.command,
                request.args,
                { cwd: request.cwd, timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
                (error: ExecFileException | null, stdout: string, stderr: string) => {
                    const durationMs = Date.now() - startTime;
                    const exitCode = error?.code ? Number(error.code) : 0;

                    this.eventBus.emitAllow(
                        'security:exec-allowed',
                        5,
                        {
                            type: 'command',
                            id: request.command,
                            detail: `args=${request.args.length} exit=${exitCode} ${durationMs}ms`,
                        },
                        { userId: request.userId, skillId: request.skillId },
                    );

                    resolve({ decision: 'allow', stdout, stderr, exitCode, durationMs });
                },
            );
        });
    }

    /**
     * Parse a command string into command + args safely (without shell).
     */
    static parseCommand(commandStr: string): { command: string; args: string[] } {
        const tokens: string[] = [];
        let current = '';
        let inQuote: string | null = null;
        let escaped = false;

        for (const char of commandStr) {
            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (inQuote) {
                if (char === inQuote) {
                    inQuote = null;
                } else {
                    current += char;
                }
                continue;
            }
            if (char === '"' || char === "'") {
                inQuote = char;
                continue;
            }
            if (char === ' ' || char === '\t') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }
            current += char;
        }
        if (current) tokens.push(current);

        return { command: tokens[0] ?? '', args: tokens.slice(1) };
    }

    /**
     * Get stats.
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get the current allowlist.
     */
    getAllowlist(): string[] {
        return [...this.config.allowlist];
    }

    /**
     * Add a command to the allowlist at runtime.
     */
    addToAllowlist(command: string): void {
        if (!this.config.allowlist.includes(command)) {
            this.config.allowlist.push(command);
        }
    }
}
