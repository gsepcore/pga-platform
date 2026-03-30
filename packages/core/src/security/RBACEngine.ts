/**
 * RBACEngine — Role-Based Access Control for Genome Shield Enterprise.
 *
 * 5 predefined roles with granular permission matrix.
 * Supports custom roles and permission inheritance.
 *
 * @module security/enterprise
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export type RoleName = 'admin' | 'manager' | 'standard' | 'restricted' | 'auditor';

export type Permission =
    // Genome operations
    | 'genome:read'
    | 'genome:write'
    | 'genome:evolve'
    | 'genome:delete'
    // Skill operations
    | 'skill:invoke:bundled'
    | 'skill:invoke:installed'
    | 'skill:invoke:custom'
    | 'skill:install'
    | 'skill:uninstall'
    // Execution
    | 'exec:safe-bin'
    | 'exec:allowlist'
    | 'exec:arbitrary'
    // Filesystem
    | 'fs:read:workspace'
    | 'fs:read:home'
    | 'fs:read:system'
    | 'fs:write:workspace'
    | 'fs:write:home'
    | 'fs:delete'
    // Network
    | 'net:outbound:allowlist'
    | 'net:outbound:any'
    | 'net:localhost'
    // Credentials
    | 'cred:read'
    | 'cred:write'
    | 'cred:rotate'
    | 'cred:delete'
    // Data access
    | 'data:public'
    | 'data:internal'
    | 'data:confidential'
    | 'data:restricted'
    | 'data:pii'
    | 'data:financial'
    | 'data:health'
    // Admin
    | 'admin:users'
    | 'admin:roles'
    | 'admin:policies'
    | 'admin:audit:read'
    | 'admin:audit:export'
    | 'admin:security:configure';

export interface Role {
    name: RoleName | string;
    description: string;
    permissions: Permission[];
    /** Role to inherit permissions from */
    inherits?: RoleName | string;
    /** Max operations per hour (0 = unlimited) */
    rateLimit: number;
    /** Session timeout in minutes (0 = no timeout) */
    sessionTimeoutMinutes: number;
}

export interface UserAssignment {
    userId: string;
    role: RoleName | string;
    assignedAt: Date;
    assignedBy: string;
    expiresAt?: Date;
}

export interface AccessCheckResult {
    allowed: boolean;
    role: string;
    permission: Permission;
    reason?: string;
}

// ─── Default Roles ──────────────────────────────────────

const ROLE_ADMIN: Role = {
    name: 'admin',
    description: 'Full system control — can manage users, roles, policies, and all operations',
    permissions: [
        'genome:read', 'genome:write', 'genome:evolve', 'genome:delete',
        'skill:invoke:bundled', 'skill:invoke:installed', 'skill:invoke:custom', 'skill:install', 'skill:uninstall',
        'exec:safe-bin', 'exec:allowlist', 'exec:arbitrary',
        'fs:read:workspace', 'fs:read:home', 'fs:read:system', 'fs:write:workspace', 'fs:write:home', 'fs:delete',
        'net:outbound:allowlist', 'net:outbound:any', 'net:localhost',
        'cred:read', 'cred:write', 'cred:rotate', 'cred:delete',
        'data:public', 'data:internal', 'data:confidential', 'data:restricted', 'data:pii', 'data:financial', 'data:health',
        'admin:users', 'admin:roles', 'admin:policies', 'admin:audit:read', 'admin:audit:export', 'admin:security:configure',
    ],
    rateLimit: 0,
    sessionTimeoutMinutes: 480,
};

const ROLE_MANAGER: Role = {
    name: 'manager',
    description: 'Team lead — can use all skills, access confidential data, view audit logs',
    inherits: 'standard',
    permissions: [
        'genome:read', 'genome:write', 'genome:evolve',
        'skill:invoke:bundled', 'skill:invoke:installed', 'skill:invoke:custom', 'skill:install',
        'exec:safe-bin', 'exec:allowlist',
        'fs:read:workspace', 'fs:read:home', 'fs:write:workspace', 'fs:write:home',
        'net:outbound:allowlist', 'net:localhost',
        'cred:read', 'cred:write',
        'data:public', 'data:internal', 'data:confidential', 'data:pii',
        'admin:audit:read',
    ],
    rateLimit: 500,
    sessionTimeoutMinutes: 480,
};

const ROLE_STANDARD: Role = {
    name: 'standard',
    description: 'Regular user — bundled skills, workspace access, no admin',
    permissions: [
        'genome:read',
        'skill:invoke:bundled', 'skill:invoke:installed',
        'exec:safe-bin',
        'fs:read:workspace', 'fs:write:workspace',
        'net:outbound:allowlist', 'net:localhost',
        'cred:read',
        'data:public', 'data:internal',
    ],
    rateLimit: 200,
    sessionTimeoutMinutes: 480,
};

const ROLE_RESTRICTED: Role = {
    name: 'restricted',
    description: 'Limited user — read-only access, basic skills only',
    permissions: [
        'genome:read',
        'skill:invoke:bundled',
        'fs:read:workspace',
        'net:localhost',
        'data:public',
    ],
    rateLimit: 50,
    sessionTimeoutMinutes: 120,
};

const ROLE_AUDITOR: Role = {
    name: 'auditor',
    description: 'Compliance auditor — read-only access to everything + audit logs + export',
    permissions: [
        'genome:read',
        'fs:read:workspace', 'fs:read:home',
        'data:public', 'data:internal', 'data:confidential', 'data:restricted',
        'admin:audit:read', 'admin:audit:export',
    ],
    rateLimit: 100,
    sessionTimeoutMinutes: 240,
};

// ─── Engine ─────────────────────────────────────────────

/**
 * Role-Based Access Control engine.
 *
 * Usage:
 * ```typescript
 * const rbac = new RBACEngine(eventBus);
 *
 * rbac.assignRole('user-123', 'standard', 'admin-1');
 *
 * const check = rbac.checkAccess('user-123', 'exec:arbitrary');
 * // check.allowed = false (standard can't exec arbitrary)
 *
 * const check2 = rbac.checkAccess('user-123', 'skill:invoke:bundled');
 * // check2.allowed = true
 * ```
 */
export class RBACEngine {
    private eventBus: SecurityEventBus;
    private roles: Map<string, Role> = new Map();
    private assignments: Map<string, UserAssignment> = new Map();
    private operationCounts: Map<string, { count: number; windowStart: number }> = new Map();

    constructor(eventBus: SecurityEventBus) {
        this.eventBus = eventBus;

        // Register default roles
        this.roles.set('admin', ROLE_ADMIN);
        this.roles.set('manager', ROLE_MANAGER);
        this.roles.set('standard', ROLE_STANDARD);
        this.roles.set('restricted', ROLE_RESTRICTED);
        this.roles.set('auditor', ROLE_AUDITOR);
    }

    /**
     * Assign a role to a user.
     */
    assignRole(userId: string, roleName: RoleName | string, assignedBy: string, expiresAt?: Date): void {
        if (!this.roles.has(roleName)) {
            throw new Error(`[RBAC] Unknown role: ${roleName}`);
        }

        this.assignments.set(userId, {
            userId,
            role: roleName,
            assignedAt: new Date(),
            assignedBy,
            expiresAt,
        });

        this.eventBus.emit({
            type: 'security:audit-entry',
            timestamp: new Date(),
            layer: 4,
            decision: 'info',
            actor: { userId: assignedBy },
            resource: { type: 'role', id: roleName, detail: `Assigned to ${userId}` },
            severity: 'info',
        });
    }

    /**
     * Remove role assignment.
     */
    revokeRole(userId: string): boolean {
        return this.assignments.delete(userId);
    }

    /**
     * Check if a user has a specific permission.
     */
    checkAccess(userId: string, permission: Permission): AccessCheckResult {
        const assignment = this.assignments.get(userId);

        // No assignment — default to restricted
        if (!assignment) {
            return {
                allowed: false,
                role: 'none',
                permission,
                reason: 'No role assigned — defaulting to deny',
            };
        }

        // Check expiry
        if (assignment.expiresAt && new Date() > assignment.expiresAt) {
            this.assignments.delete(userId);
            return {
                allowed: false,
                role: assignment.role,
                permission,
                reason: 'Role assignment expired',
            };
        }

        const role = this.roles.get(assignment.role);
        if (!role) {
            return { allowed: false, role: assignment.role, permission, reason: 'Role not found' };
        }

        // Check rate limit
        if (role.rateLimit > 0 && !this.checkRateLimit(userId, role.rateLimit)) {
            this.eventBus.emitDeny('security:capability-denied', 4, {
                type: 'rate-limit',
                id: userId,
                detail: `Exceeded ${role.rateLimit} ops/hour`,
            }, 'warning', { userId });

            return { allowed: false, role: role.name, permission, reason: `Rate limit exceeded (${role.rateLimit}/hour)` };
        }

        // Check permission (including inherited)
        const allPermissions = this.resolvePermissions(role);
        const allowed = allPermissions.includes(permission);

        if (!allowed) {
            this.eventBus.emitDeny('security:capability-denied', 4, {
                type: 'rbac',
                id: permission,
                detail: `Role ${role.name} lacks ${permission}`,
            }, 'warning', { userId });
        }

        // Increment operation count
        this.incrementOps(userId);

        return { allowed, role: role.name, permission, reason: allowed ? undefined : `Role "${role.name}" does not have permission "${permission}"` };
    }

    /**
     * Get a user's current role.
     */
    getUserRole(userId: string): Role | null {
        const assignment = this.assignments.get(userId);
        if (!assignment) return null;
        return this.roles.get(assignment.role) ?? null;
    }

    /**
     * Get all permissions for a user (resolved with inheritance).
     */
    getUserPermissions(userId: string): Permission[] {
        const role = this.getUserRole(userId);
        if (!role) return [];
        return this.resolvePermissions(role);
    }

    /**
     * Register a custom role.
     */
    registerRole(role: Role): void {
        this.roles.set(role.name, role);
    }

    /**
     * Get all registered roles.
     */
    getRoles(): Role[] {
        return [...this.roles.values()];
    }

    /**
     * Get all user assignments.
     */
    getAssignments(): UserAssignment[] {
        return [...this.assignments.values()];
    }

    /**
     * Check if a user has a specific role.
     */
    hasRole(userId: string, roleName: string): boolean {
        const assignment = this.assignments.get(userId);
        return assignment?.role === roleName;
    }

    // ─── Internal ───────────────────────────────────────

    private resolvePermissions(role: Role): Permission[] {
        const permissions = [...role.permissions];

        if (role.inherits) {
            const parent = this.roles.get(role.inherits);
            if (parent) {
                const parentPerms = this.resolvePermissions(parent);
                for (const p of parentPerms) {
                    if (!permissions.includes(p)) permissions.push(p);
                }
            }
        }

        return permissions;
    }

    private checkRateLimit(userId: string, limit: number): boolean {
        const now = Date.now();
        const record = this.operationCounts.get(userId);

        if (!record || now - record.windowStart > 3_600_000) {
            this.operationCounts.set(userId, { count: 1, windowStart: now });
            return true;
        }

        return record.count < limit;
    }

    private incrementOps(userId: string): void {
        const record = this.operationCounts.get(userId);
        if (record) {
            record.count++;
        }
    }
}
