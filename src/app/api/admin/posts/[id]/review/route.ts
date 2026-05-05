import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorizedResponse } from '@/lib/auth';
import { userCan } from '@/lib/permissions';
import { withAuditLog } from '@/lib/audit';

// editor+ 批准 / 驳回 待审文章
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  if (!userCan(user, 'content:review')) {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const decision = body?.decision;
  const note = typeof body?.note === 'string' ? body.note.trim() : '';

  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      published: true,
      authorId: true,
      scheduledAt: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  if (post.status !== 'pending') {
    return NextResponse.json(
      { error: '只有待审状态的文章才能进行审核' },
      { status: 400 }
    );
  }

  if (decision === 'reject' && note.length === 0) {
    return NextResponse.json(
      { error: '驳回时必须填写说明' },
      { status: 400 }
    );
  }

  const now = new Date();

  // Approve: 若设置了未来时间则保留为定时发布，否则立刻发布
  const isScheduledFuture = !!post.scheduledAt && post.scheduledAt.getTime() > now.getTime();
  const approveData = isScheduledFuture
    ? { status: 'published' as const, published: false }
    : { status: 'published' as const, published: true };

  const updated = await withAuditLog(
    {
      action: decision === 'approve' ? 'approve' : 'reject',
      resource: 'post',
      resourceId: id,
    },
    () => prisma.post.update({
      where: { id },
      data:
        decision === 'approve'
          ? {
              ...approveData,
              reviewerId: user.id,
              reviewedAt: now,
              reviewNote: note || null,
            }
          : {
              status: 'rejected',
              published: false,
              reviewerId: user.id,
              reviewedAt: now,
              reviewNote: note,
            },
      select: { id: true, status: true, published: true, reviewNote: true },
    }),
    () => ({ status: post.status, published: post.published }),
    (result) => ({ status: result.status, published: result.published })
  );

  return NextResponse.json({ success: true, post: updated });
}
