import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { sendNewCommentNotification, sendReplyNotification } from '@/lib/email';

// 审核通过评论
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    
    // 获取评论及其关联的信息
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      include: {
        post: { select: { id: true, title: true } },
        parent: { select: { author: true, email: true } },
      },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      );
    }

    const wasApproved = existingComment.approved;

    const comment = await withAuditLog(
      { action: 'approve', resource: 'comment', resourceId: id },
      () => prisma.comment.update({
        where: { id },
        data: { approved: true },
        include: {
          post: { select: { id: true, title: true } },
          parent: { select: { author: true, email: true } },
        },
      }),
      () => ({ author: existingComment.author, approved: wasApproved }),
      (result) => ({ author: result.author, approved: true })
    );

    // 如果之前未通过，现在审核通过了，发送邮件通知
    if (!wasApproved) {
      setImmediate(() => {
        void sendNewCommentNotification({
          author: comment.author,
          email: comment.email,
          content: comment.content,
          createdAt: comment.createdAt,
          post: comment.post,
          parent: comment.parent,
        });
      });

      // 如果是回复且被回复者留了邮箱，发送通知给被回复的人
      const parent = comment.parent;
      if (parent && parent.email) {
        setImmediate(() => {
          void sendReplyNotification({
            author: comment.author,
            content: comment.content,
            createdAt: comment.createdAt,
            post: comment.post,
            parentEmail: parent.email as string,
            parentAuthor: parent.author,
          });
        });
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Approve comment error:', error);
    return NextResponse.json(
      { error: '审核评论失败' },
      { status: 500 }
    );
  }
}

// 删除评论
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    
    const oldComment = await prisma.comment.findUnique({ where: { id } });

    await withAuditLog(
      { action: 'delete', resource: 'comment', resourceId: id },
      () => prisma.comment.delete({ where: { id } }),
      () => oldComment ? { author: oldComment.author } : null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: '删除评论失败' },
      { status: 500 }
    );
  }
}
