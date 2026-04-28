import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// 获取所有评论（支持搜索、筛选）
export async function GET(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const postId = searchParams.get('postId') || '';
    const status = searchParams.get('status') || 'all'; // all, pending, approved

    const where: Prisma.CommentWhereInput = {};

    if (search) {
      where.OR = [
        { author: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (postId) {
      where.postId = postId;
    }

    if (status === 'pending') {
      where.approved = false;
    } else if (status === 'approved') {
      where.approved = true;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        parent: {
          select: {
            id: true,
            author: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: '获取评论失败' },
      { status: 500 }
    );
  }
}

// 批量操作（审核、删除）
export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { action, ids } = await request.json();

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      await prisma.comment.updateMany({
        where: { id: { in: ids } },
        data: { approved: true },
      });

      await createAuditLog({
        action: 'approve',
        resource: 'comment',
        newData: { count: ids.length, ids },
      });
    } else if (action === 'delete') {
      await prisma.comment.deleteMany({
        where: { id: { in: ids } },
      });

      await createAuditLog({
        action: 'delete',
        resource: 'comment',
        newData: { count: ids.length, ids },
      });
    } else {
      return NextResponse.json(
        { error: '不支持的操作' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      { error: '批量操作失败' },
      { status: 500 }
    );
  }
}
