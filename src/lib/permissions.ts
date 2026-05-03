import {
  forbiddenResponse,
  getCurrentUser,
  hasPermission,
  unauthorizedResponse,
  type AuthUser,
  type UserRole,
} from '@/lib/auth';

export type Permission =
  | 'analytics:read'
  | 'audit:read'
  | 'backup:manage'
  | 'comments:moderate'
  | 'content:manage'
  | 'knowledge:sync'
  | 'media:manage'
  | 'settings:manage'
  | 'taxonomy:manage'
  | 'users:manage';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'analytics:read',
    'audit:read',
    'backup:manage',
    'comments:moderate',
    'content:manage',
    'knowledge:sync',
    'media:manage',
    'settings:manage',
    'taxonomy:manage',
    'users:manage',
  ],
  admin: [
    'analytics:read',
    'audit:read',
    'comments:moderate',
    'content:manage',
    'knowledge:sync',
    'media:manage',
    'taxonomy:manage',
  ],
  author: [
    'analytics:read',
    'content:manage',
    'media:manage',
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function userCan(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return getPermissionsForRole(user.role).includes(permission);
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, user: null, response: unauthorizedResponse() };
  }
  if (!userCan(user, permission)) {
    return { ok: false as const, user, response: forbiddenResponse() };
  }
  return { ok: true as const, user };
}

export async function requireMinimumRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, user: null, response: unauthorizedResponse() };
  }
  if (!hasPermission(user.role, role)) {
    return { ok: false as const, user, response: forbiddenResponse() };
  }
  return { ok: true as const, user };
}
