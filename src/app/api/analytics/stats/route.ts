import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDays(url: string) {
  const days = Number.parseInt(new URL(url).searchParams.get('days') || '7', 10);
  if ([7, 14, 30, 90].includes(days)) return days;
  return 7;
}

function groupRows(rows: { name: string | null; count: number }[]) {
  return rows.map((row) => ({
    name: row.name || 'unknown',
    count: row.count,
  }));
}

export async function GET(req: Request) {
  const isAuthenticated = await requireAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const days = parseDays(req.url);
    const since = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));

    const [
      totalViews,
      totalSessions,
      sessionStats,
      dailyViews,
      topPosts,
      devices,
      browsers,
      referers,
    ] = await Promise.all([
      prisma.postView.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsSession.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsSession.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { duration: true, pageViews: true },
      }),
      prisma.postView.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.post.findMany({
        orderBy: { viewCount: 'desc' },
        take: 10,
        select: { id: true, title: true, viewCount: true },
      }),
      prisma.analyticsSession.groupBy({
        by: ['device'],
        where: { createdAt: { gte: since }, isBot: false },
        _count: { _all: true },
        orderBy: { _count: { device: 'desc' } },
        take: 6,
      }),
      prisma.analyticsSession.groupBy({
        by: ['browser'],
        where: { createdAt: { gte: since }, isBot: false },
        _count: { _all: true },
        orderBy: { _count: { browser: 'desc' } },
        take: 6,
      }),
      prisma.analyticsSession.groupBy({
        by: ['referer'],
        where: { createdAt: { gte: since }, isBot: false, referer: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referer: 'desc' } },
        take: 8,
      }),
    ]);

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = startOfDay(new Date(since.getTime() + i * DAY_MS));
      buckets.set(date.toISOString().slice(0, 10), 0);
    }
    for (const row of dailyViews) {
      const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + row._count._all);
    }

    const deviceRows = groupRows(devices.map((row) => ({
      name: row.device,
      count: row._count?._all || 0,
    })));
    const browserRows = groupRows(browsers.map((row) => ({
      name: row.browser,
      count: row._count?._all || 0,
    })));
    const refererRows = groupRows(referers.map((row) => ({
      name: row.referer,
      count: row._count?._all || 0,
    }))).map((row) => ({
      ...row,
      name: row.name.replace(/^https?:\/\//, '').split('/')[0] || 'direct',
    }));

    return NextResponse.json({
      period: { days },
      overview: {
        totalViews,
        totalSessions,
        avgDuration: Math.round(sessionStats._avg.duration || 0),
        avgPageViews: Number((sessionStats._avg.pageViews || 0).toFixed(1)),
      },
      trend: Array.from(buckets.entries()).map(([date, count]) => ({ date, count })),
      topPosts: topPosts.map((post) => ({ postId: post.id, title: post.title, views: post.viewCount })),
      devices: deviceRows,
      browsers: browserRows,
      referers: refererRows,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
