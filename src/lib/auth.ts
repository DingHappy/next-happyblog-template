import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD_HASH =
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // sha256("admin123")

export type UserRole = 'superadmin' | 'admin' | 'author';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
  avatar: string | null;
}

const ROLES: Record<UserRole, UserRole[]> = {
  superadmin: ['superadmin', 'admin', 'author'],
  admin: ['admin', 'author'],
  author: ['author'],
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLES[userRole]?.includes(requiredRole) ?? false;
}

function resolvePasswordHash(): string {
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envHash) return envHash.trim();

  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword) {
    return crypto.createHash('sha256').update(envPassword).digest('hex');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[auth] ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be set in production');
  }
  return DEFAULT_PASSWORD_HASH;
}

const PASSWORD_HASH = resolvePasswordHash();

export async function createLegacySession(): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: sessionId, expiresAt } });

  prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return sessionId;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { id: sessionId, userId, expiresAt }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return sessionId;
}

export async function getSessionUser(
  sessionId: string | undefined | null
): Promise<AuthUser | null> {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  if (Date.now() > session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  if (!session.user) return null;
  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    role: session.user.role as UserRole,
    displayName: session.user.displayName,
    avatar: session.user.avatar,
  };
}

export async function verifySession(
  sessionId: string | undefined | null
): Promise<boolean> {
  if (!sessionId) return false;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { expiresAt: true, userId: true },
  });
  if (!session) return false;
  if (Date.now() > session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return false;
  }
  return true;
}

export async function requireAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;
  return verifySession(sessionId);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;
  return getSessionUser(sessionId);
}

export async function requireRole(requiredRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return hasPermission(user.role, requiredRole);
}

export async function isAdmin(): Promise<boolean> {
  return requireRole('admin');
}

export async function isSuperAdmin(): Promise<boolean> {
  return requireRole('superadmin');
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: '权限不足' }, { status: 403 });
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export function verifyPassword(password: string): boolean {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash === PASSWORD_HASH;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function ensureDefaultUser(): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { role: 'superadmin' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: PASSWORD_HASH,
        role: 'superadmin',
        displayName: '管理员',
      },
    });
    console.log('[auth] 创建默认开发管理员账号: admin / admin123');
  }
}
