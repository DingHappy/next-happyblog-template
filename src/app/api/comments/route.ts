import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNewCommentNotification, sendReplyNotification } from '@/lib/email';
import { moderateComment } from '@/lib/comment-moderation';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

// 获取评论（包含嵌套回复）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  try {
    // 只获取顶层评论（没有 parentId 的），并包含其回复
    const comments = await prisma.comment.findMany({
      where: { postId, approved: true, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          where: { approved: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// 创建评论（支持回复）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, parentId, author, email, content, website } = body;

    // 蜜罐：人类不会填这个隐藏字段，机器人会
    // 静默返回 201 让 bot 以为成功，避免它调整策略
    if (typeof website === 'string' && website.trim().length > 0) {
      return NextResponse.json({ id: 'silent', approved: false }, { status: 201 });
    }

    if (!postId || !author || !content) {
      return NextResponse.json(
        { error: 'postId, author, and content are required' },
        { status: 400 }
      );
    }

    // 验证 parentId 是否存在（如果提供了）
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment) {
        return NextResponse.json(
          { error: '回复的评论不存在' },
          { status: 404 }
        );
      }
    }

    const ip = getClientIp(request);

    // 速率限制：同 IP 1 分钟最多 3 条
    if (ip) {
      const result = rateLimit({
        key: `comments:${ip}`,
        limit: 3,
        windowMs: 60 * 1000,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: '评论过于频繁，请稍后再试' },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) },
          },
        );
      }
    }

    const moderation = moderateComment({ author, email: email ?? null, content });

    // 获取被回复评论的信息（如果有）
    let parentComment: { author: string; email: string | null } | null = null;
    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { author: true, email: true },
      });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        parentId: parentId || null,
        author,
        email,
        content,
        approved: moderation.approved,
        moderationReason: moderation.reason,
      },
      include: {
        replies: {
          where: { approved: true },
          orderBy: { createdAt: 'asc' },
        },
        post: {
          select: { id: true, title: true },
        },
      },
    });

    // 异步发送邮件通知，不阻塞响应
    if (comment.approved) {
      // 发送通知给博主
      setImmediate(() => {
        void sendNewCommentNotification({
          author: comment.author,
          email: comment.email,
          content: comment.content,
          createdAt: comment.createdAt,
          post: comment.post,
          parent: parentComment,
        });
      });

      // 如果是回复且被回复者留了邮箱，发送通知给被回复的人
      if (parentComment && parentComment.email) {
        setImmediate(() => {
          void sendReplyNotification({
            author: comment.author,
            content: comment.content,
            createdAt: comment.createdAt,
            post: comment.post,
            parentEmail: parentComment.email as string,
            parentAuthor: parentComment.author,
          });
        });
      }
    }

    return NextResponse.json({
      ...comment,
      moderationReason: undefined,
      message: comment.approved ? '评论提交成功' : '评论已提交，审核后显示',
    }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
