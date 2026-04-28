import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNewCommentNotification, sendReplyNotification } from '@/lib/email';

// 垃圾评论关键词黑名单
const SPAM_KEYWORDS = [
  'http://', 'https://', 'www.', '.com', '.cn', '.net', '.org',
  '减肥', '祛痘', '祛斑', '丰胸', '壮阳', '伟哥',
  '贷款', '放贷', '套现', '信用卡', '博彩', '赌博',
  '赚钱', '兼职', '日赚', '月入', '加微信', '加V',
  'seo', '优化', '排名', '代运营', '刷流量',
  'fuck', 'shit', 'porn', 'sex', 'bitch',
  '垃圾广告', '测试测试', '111', '222', '333',
  '...', '。。。', '，，，', '，，，，',
].map(w => w.toLowerCase());

const SPAM_EMAIL_DOMAINS = [
  'temp-mail.org', 'mailinator.com', '10minutemail.com',
].map(d => d.toLowerCase());

// 频率限制：同一个 IP 1 分钟内最多 3 条
const RATE_LIMIT_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3;

// 内存级 dedup，挂在 globalThis 上以扛 HMR；多实例部署需要换 Redis
const globalForRate = globalThis as unknown as {
  __commentRate?: Map<string, number[]>;
};
const recentByIp: Map<string, number[]> =
  globalForRate.__commentRate ?? (globalForRate.__commentRate = new Map());

function isRateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_MS
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    recentByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  recentByIp.set(ip, recent);
  return false;
}

// 内容嫌疑度：命中 → 标记为待审核，但不直接拒绝
function looksSpammy(email: string | null, content: string): boolean {
  if (content.length < 2 || content.length > 2000) return true;

  const contentLower = content.toLowerCase();
  const matches = SPAM_KEYWORDS.filter((k) => contentLower.includes(k));
  if (matches.length >= 2) return true;

  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && SPAM_EMAIL_DOMAINS.some((d) => domain.includes(d))) return true;
  }

  if (/(.)\1{4,}/.test(content)) return true;
  if (/^[^a-zA-Z一-龥]*$/.test(content.replace(/\s/g, ''))) return true;

  return false;
}

function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

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

    // 速率限制：硬拒绝
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: '评论过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 内容嫌疑度：标记待审核
    const suspicious = looksSpammy(email ?? null, content);

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
        approved: !suspicious,
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
