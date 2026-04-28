import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const TTL_MS = 24 * 60 * 60 * 1000;

const globalForView = globalThis as unknown as {
  __viewDedup?: Map<string, number>;
};
const viewDedup: Map<string, number> =
  globalForView.__viewDedup ?? (globalForView.__viewDedup = new Map());

function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(request);
  const key = `${ip}:${id}`;
  const now = Date.now();
  const last = viewDedup.get(key);

  if (last && now - last < TTL_MS) {
    return NextResponse.json({ deduped: true });
  }
  viewDedup.set(key, now);

  // 简单清理：超过 1 万条时扫一次过期的
  if (viewDedup.size > 10000) {
    for (const [k, t] of viewDedup.entries()) {
      if (now - t > TTL_MS) viewDedup.delete(k);
    }
  }

  try {
    const [post] = await prisma.$transaction([
      prisma.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      }),
      prisma.postView.create({
        data: { postId: id },
        select: { id: true },
      }),
    ]);
    return NextResponse.json({ ok: true, viewCount: post.viewCount });
  } catch (error) {
    console.error('view increment failed:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
