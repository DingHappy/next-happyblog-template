import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { publishDuePosts } from '@/lib/scheduled-publish';

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
    const result = await publishDuePosts();

    if (result.count === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要发布的文章',
        published: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `成功发布 ${result.count} 篇文章`,
      published: result.count,
      postIds: result.posts.map((post) => post.id),
    });
  } catch (error) {
    console.error('Scheduled publish error:', error);
    return NextResponse.json(
      { error: '定时发布检查失败' },
      { status: 500 }
    );
  }
}
