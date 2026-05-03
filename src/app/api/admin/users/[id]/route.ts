import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hashPassword, forbiddenResponse, getCurrentUser, hasPermission, type UserRole } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const auth = await requirePermission('users:manage');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
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
  });

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const auth = await requirePermission('users:manage');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { password, role, ...data } = body;

  const currentUser = await getCurrentUser();
  const targetUser = await prisma.user.findUnique({ where: { id } });

  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  if (targetUser.role === 'superadmin' && currentUser?.role !== 'superadmin') {
    return forbiddenResponse();
  }

  if (role && !hasPermission(currentUser?.role || 'author', role as UserRole)) {
    return forbiddenResponse();
  }

  const updateData: Prisma.UserUpdateInput = {
    email: data.email || null,
    displayName: data.displayName || null,
    avatar: data.avatar || null,
    bio: data.bio || null,
  };
  if (password) {
    updateData.password = hashPassword(password);
  }
  if (role) {
    updateData.role = role;
  }

  const user = await withAuditLog(
    { action: 'update', resource: 'user', resourceId: id },
    () => prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        displayName: true,
      },
    }),
    () => targetUser ? { username: targetUser.username, role: targetUser.role } : null,
    (result) => ({ id: result.id, username: result.username, role: result.role })
  );

  return NextResponse.json(user);
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const auth = await requirePermission('users:manage');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (currentUser?.id === id) {
    return NextResponse.json(
      { error: '不能删除自己的账号' },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  if (targetUser.role === 'superadmin' && currentUser?.role !== 'superadmin') {
    return forbiddenResponse();
  }

  const superAdminCount = await prisma.user.count({ where: { role: 'superadmin' } });
  if (targetUser.role === 'superadmin' && superAdminCount <= 1) {
    return NextResponse.json(
      { error: '至少保留一个超级管理员账号' },
      { status: 400 }
    );
  }

  await withAuditLog(
    { action: 'delete', resource: 'user', resourceId: id },
    () => prisma.user.delete({ where: { id } }),
    () => ({ username: targetUser.username, role: targetUser.role })
  );

  return NextResponse.json({ success: true });
}
