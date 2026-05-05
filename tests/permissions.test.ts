import { describe, expect, it } from 'vitest';
import { getPermissionsForRole, userCan } from '@/lib/permissions';
import type { AuthUser } from '@/lib/auth';

const buildUser = (role: AuthUser['role']): AuthUser => ({
  id: 'u1',
  username: 'tester',
  email: null,
  role,
  displayName: null,
  avatar: null,
});

describe('permissions', () => {
  it('superadmin has every permission', () => {
    expect(getPermissionsForRole('superadmin')).toContain('users:manage');
    expect(getPermissionsForRole('superadmin')).toContain('settings:manage');
  });

  it('admin cannot manage users or settings', () => {
    expect(userCan(buildUser('admin'), 'users:manage')).toBe(false);
    expect(userCan(buildUser('admin'), 'settings:manage')).toBe(false);
    expect(userCan(buildUser('admin'), 'content:manage')).toBe(true);
  });

  it('editor can review and manage content but not sync knowledge or users', () => {
    expect(userCan(buildUser('editor'), 'content:manage')).toBe(true);
    expect(userCan(buildUser('editor'), 'content:review')).toBe(true);
    expect(userCan(buildUser('editor'), 'comments:moderate')).toBe(true);
    expect(userCan(buildUser('editor'), 'taxonomy:manage')).toBe(true);
    expect(userCan(buildUser('editor'), 'media:manage')).toBe(true);
    expect(userCan(buildUser('editor'), 'knowledge:sync')).toBe(false);
    expect(userCan(buildUser('editor'), 'users:manage')).toBe(false);
  });

  it('author is limited to own content and analytics', () => {
    expect(userCan(buildUser('author'), 'content:manage')).toBe(true);
    expect(userCan(buildUser('author'), 'comments:moderate')).toBe(false);
    expect(userCan(buildUser('author'), 'taxonomy:manage')).toBe(false);
  });

  it('null user is denied everything', () => {
    expect(userCan(null, 'content:manage')).toBe(false);
  });
});
