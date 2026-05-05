import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from '@/lib/auth';
import { canManageAnyPost } from '@/lib/permissions';
import { withAuditLog } from '@/lib/audit';

// 作者提交文章进入评审：draft / rejected -> pending
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, authorId: true, published: true },
  });

  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  // 仅本人或可管理任意文章者可以提交
  if (!canManageAnyPost(user) && post.authorId !== user.id) {
    return forbiddenResponse();
  }

  if (post.status === 'pending') {
    return NextResponse.json({ error: '文章已在审核中' }, { status: 400 });
  }
  if (post.status === 'published') {
    return NextResponse.json({ error: '文章已发布，无需提交审核' }, { status: 400 });
  }

  const updated = await withAuditLog(
    { action: 'submit', resource: 'post', resourceId: id },
    () => prisma.post.update({
      where: { id },
      data: {
        status: 'pending',
        reviewNote: null,
      },
      select: { id: true, status: true },
    }),
    () => ({ status: post.status }),
    (result) => ({ status: result.status })
  );

  return NextResponse.json({ success: true, post: updated });
}
