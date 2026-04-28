import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function readRequestSecret(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }

  const url = new URL(request.url);
  return url.searchParams.get('secret')?.trim() || '';
}

function isValidSecret(requestSecret: string, expectedSecret: string) {
  if (!requestSecret || !expectedSecret) return false;

  const requestBuffer = Buffer.from(requestSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  return (
    requestBuffer.length === expectedBuffer.length &&
    timingSafeEqual(requestBuffer, expectedBuffer)
  );
}

// GET /api/scheduled-publish - 检查并发布定时文章
// 可以配置 cron 任务定期调用此接口
export async function GET(request: Request) {
  const expectedSecret = process.env.SCHEDULED_PUBLISH_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: '定时发布密钥未配置' },
      { status: 500 }
    );
  }

  if (!isValidSecret(readRequestSecret(request), expectedSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();

    // 查找所有 scheduledAt <= 当前时间 且 published = false 的文章
    const postsToPublish = await prisma.post.findMany({
      where: {
        scheduledAt: {
          lte: now,
        },
        published: false,
      },
    });

    if (postsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要发布的文章',
        published: 0,
      });
    }

    // 批量更新文章状态
    const updateResult = await prisma.post.updateMany({
      where: {
        id: {
          in: postsToPublish.map(p => p.id),
        },
      },
      data: {
        published: true,
        scheduledAt: null, // 清空定时时间
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功发布 ${updateResult.count} 篇文章`,
      published: updateResult.count,
      postIds: postsToPublish.map(p => p.id),
    });
  } catch (error) {
    console.error('Scheduled publish error:', error);
    return NextResponse.json(
      { error: '定时发布检查失败' },
      { status: 500 }
    );
  }
}
