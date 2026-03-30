import { describe, it, expect } from 'vitest';
import { RBACEngine } from '../RBACEngine.js';
import { SecurityEventBus } from '../SecurityEventBus.js';

const bus = () => new SecurityEventBus();

describe('RBACEngine', () => {
    it('should have 5 default roles', () => {
        const rbac = new RBACEngine(bus());
        const roles = rbac.getRoles();
        expect(roles).toHaveLength(5);
        expect(roles.map(r => r.name)).toEqual(['admin', 'manager', 'standard', 'restricted', 'auditor']);
    });

    it('should assign and check roles', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'standard', 'admin-1');
        expect(rbac.hasRole('user-1', 'standard')).toBe(true);
        expect(rbac.hasRole('user-1', 'admin')).toBe(false);
    });

    it('should allow permissions for assigned role', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'standard', 'admin-1');

        expect(rbac.checkAccess('user-1', 'genome:read').allowed).toBe(true);
        expect(rbac.checkAccess('user-1', 'skill:invoke:bundled').allowed).toBe(true);
        expect(rbac.checkAccess('user-1', 'fs:read:workspace').allowed).toBe(true);
    });

    it('should deny permissions not in role', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'standard', 'admin-1');

        expect(rbac.checkAccess('user-1', 'exec:arbitrary').allowed).toBe(false);
        expect(rbac.checkAccess('user-1', 'admin:users').allowed).toBe(false);
        expect(rbac.checkAccess('user-1', 'data:restricted').allowed).toBe(false);
    });

    it('admin should have all permissions', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('admin-1', 'admin', 'system');

        expect(rbac.checkAccess('admin-1', 'exec:arbitrary').allowed).toBe(true);
        expect(rbac.checkAccess('admin-1', 'admin:users').allowed).toBe(true);
        expect(rbac.checkAccess('admin-1', 'data:restricted').allowed).toBe(true);
        expect(rbac.checkAccess('admin-1', 'cred:delete').allowed).toBe(true);
    });

    it('restricted should have minimal permissions', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'restricted', 'admin-1');

        expect(rbac.checkAccess('user-1', 'genome:read').allowed).toBe(true);
        expect(rbac.checkAccess('user-1', 'skill:invoke:bundled').allowed).toBe(true);
        expect(rbac.checkAccess('user-1', 'genome:write').allowed).toBe(false);
        expect(rbac.checkAccess('user-1', 'exec:safe-bin').allowed).toBe(false);
    });

    it('auditor should read everything + export but not write', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('auditor-1', 'auditor', 'admin-1');

        expect(rbac.checkAccess('auditor-1', 'admin:audit:read').allowed).toBe(true);
        expect(rbac.checkAccess('auditor-1', 'admin:audit:export').allowed).toBe(true);
        expect(rbac.checkAccess('auditor-1', 'data:restricted').allowed).toBe(true);
        expect(rbac.checkAccess('auditor-1', 'genome:write').allowed).toBe(false);
        expect(rbac.checkAccess('auditor-1', 'exec:safe-bin').allowed).toBe(false);
    });

    it('should deny unassigned users', () => {
        const rbac = new RBACEngine(bus());
        const result = rbac.checkAccess('unknown-user', 'genome:read');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('No role assigned');
    });

    it('should revoke roles', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'admin', 'system');
        expect(rbac.checkAccess('user-1', 'admin:users').allowed).toBe(true);

        rbac.revokeRole('user-1');
        expect(rbac.checkAccess('user-1', 'admin:users').allowed).toBe(false);
    });

    it('should handle expired role assignments', () => {
        const rbac = new RBACEngine(bus());
        const pastDate = new Date(Date.now() - 1000);
        rbac.assignRole('user-1', 'admin', 'system', pastDate);

        const result = rbac.checkAccess('user-1', 'genome:read');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('expired');
    });

    it('should resolve inherited permissions (manager inherits standard)', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('mgr-1', 'manager', 'admin-1');

        // Manager's own permissions
        expect(rbac.checkAccess('mgr-1', 'data:confidential').allowed).toBe(true);
        expect(rbac.checkAccess('mgr-1', 'admin:audit:read').allowed).toBe(true);

        // Inherited from standard
        expect(rbac.checkAccess('mgr-1', 'genome:read').allowed).toBe(true);
    });

    it('should list user permissions', () => {
        const rbac = new RBACEngine(bus());
        rbac.assignRole('user-1', 'restricted', 'admin-1');

        const perms = rbac.getUserPermissions('user-1');
        expect(perms).toContain('genome:read');
        expect(perms).toContain('skill:invoke:bundled');
        expect(perms).not.toContain('admin:users');
    });

    it('should register custom roles', () => {
        const rbac = new RBACEngine(bus());
        rbac.registerRole({
            name: 'data-analyst',
            description: 'Custom role for data team',
            permissions: ['genome:read', 'data:public', 'data:internal', 'data:confidential'],
            rateLimit: 100,
            sessionTimeoutMinutes: 240,
        });

        rbac.assignRole('analyst-1', 'data-analyst', 'admin-1');
        expect(rbac.checkAccess('analyst-1', 'data:confidential').allowed).toBe(true);
        expect(rbac.checkAccess('analyst-1', 'exec:safe-bin').allowed).toBe(false);
    });

    it('should enforce rate limits', () => {
        const rbac = new RBACEngine(bus());
        rbac.registerRole({
            name: 'rate-limited',
            description: 'Test role with low rate limit',
            permissions: ['genome:read'],
            rateLimit: 3,
            sessionTimeoutMinutes: 60,
        });

        rbac.assignRole('user-1', 'rate-limited', 'admin-1');

        expect(rbac.checkAccess('user-1', 'genome:read').allowed).toBe(true);  // count=1 after
        expect(rbac.checkAccess('user-1', 'genome:read').allowed).toBe(true);  // count=2 after
        expect(rbac.checkAccess('user-1', 'genome:read').allowed).toBe(false); // count=3, 3 < 3 = false
    });

    it('should throw on unknown role assignment', () => {
        const rbac = new RBACEngine(bus());
        expect(() => rbac.assignRole('user-1', 'nonexistent', 'admin')).toThrow('Unknown role');
    });

    it('should return null for unassigned user role', () => {
        const rbac = new RBACEngine(bus());
        expect(rbac.getUserRole('nobody')).toBeNull();
    });
});
