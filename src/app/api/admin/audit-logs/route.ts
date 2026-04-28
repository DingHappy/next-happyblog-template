import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await requireRole('admin'))) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const action = searchParams.get('action');
  const resource = searchParams.get('resource');
  const userId = searchParams.get('userId');

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
