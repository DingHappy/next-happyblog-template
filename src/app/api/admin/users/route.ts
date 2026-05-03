import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, hashPassword, unauthorizedResponse, type UserRole } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';

export async function GET() {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      displayName: true,
      avatar: true,
      bio: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  const body = await request.json();
  const { username, email, password, role, displayName, avatar, bio } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: '用户名和密码不能为空' },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: '用户名已存在' },
      { status: 400 }
    );
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: '邮箱已被使用' },
        { status: 400 }
      );
    }
  }

  const user = await withAuditLog(
    { action: 'create', resource: 'user' },
    () => prisma.user.create({
      data: {
        username,
        email: email || null,
        password: hashPassword(password),
        role: (role as UserRole) || 'author',
        displayName: displayName || null,
        avatar: avatar || null,
        bio: bio || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        displayName: true,
      },
    }),
      undefined,
      (result) => ({ id: result.id, username: result.username })
  );

  return NextResponse.json(user);
}
