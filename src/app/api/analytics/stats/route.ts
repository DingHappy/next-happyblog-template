import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_TIME_ZONE = process.env.ANALYTICS_TIME_ZONE || 'Asia/Shanghai';

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

function formatDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function groupRows(rows: { name: string | null; count: number }[]) {
  return rows.map((row) => ({
    name: row.name || 'unknown',
    count: row.count,
  }));
}

function getHost(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function getInternalHosts(req: Request) {
  const hosts = new Set<string>();
  const requestHost = getHost(req.url);
  const publicUrlHost = getHost(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL);

  if (requestHost) hosts.add(requestHost);
  if (publicUrlHost) hosts.add(publicUrlHost);

  return hosts;
}

function normalizeSourceHost(host: string) {
  if (host.endsWith('google.com')) return 'google';
  if (host.endsWith('baidu.com')) return 'baidu';
  if (host.endsWith('bing.com')) return 'bing';
  if (host.endsWith('github.com')) return 'github';
  if (host.endsWith('zhihu.com')) return 'zhihu';
  if (host.endsWith('x.com') || host.endsWith('twitter.com')) return 'x';
  if (host.endsWith('weibo.com')) return 'weibo';
  if (host.endsWith('juejin.cn')) return 'juejin';
  return host;
}

function classifyReferer(referer: string | null, internalHosts: Set<string>) {
  const host = getHost(referer);
  if (!host) return 'direct';
  if (internalHosts.has(host)) return 'internal';
  return normalizeSourceHost(host);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(req: Request) {
  const isAuthenticated = await requireAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const days = parseDays(req.url);
    const since = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
    const previousSince = startOfDay(new Date(since.getTime() - days * DAY_MS));
    const internalHosts = getInternalHosts(req);

    const [
      totalViews,
      totalSessions,
      sessionStats,
      previousViews,
      previousSessions,
      previousSessionStats,
      dailyViewRows,
      topPostViews,
      devices,
      browsers,
      refererRows,
    ] = await Promise.all([
      prisma.postView.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsSession.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsSession.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { duration: true, pageViews: true },
      }),
      prisma.postView.count({
        where: {
          createdAt: {
            gte: previousSince,
            lt: since,
          },
        },
      }),
      prisma.analyticsSession.count({
        where: {
          createdAt: {
            gte: previousSince,
            lt: since,
          },
        },
      }),
      prisma.analyticsSession.aggregate({
        where: {
          createdAt: {
            gte: previousSince,
            lt: since,
          },
        },
        _avg: { duration: true, pageViews: true },
      }),
      prisma.postView.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.postView.groupBy({
        by: ['postId'],
        where: { createdAt: { gte: since }, postId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { postId: 'desc' } },
        take: 10,
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
      prisma.postView.findMany({
        where: { createdAt: { gte: since } },
        select: { referer: true },
      }),
    ]);

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = startOfDay(new Date(since.getTime() + i * DAY_MS));
      buckets.set(formatDateKey(date), 0);
    }
    for (const row of dailyViewRows) {
      const key = formatDateKey(row.createdAt);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const topPostIds = topPostViews
      .map((row) => row.postId)
      .filter((postId): postId is string => Boolean(postId));
    const topPostRecords = await prisma.post.findMany({
      where: { id: { in: topPostIds } },
      select: { id: true, slug: true, title: true },
    });
    const topPostById = new Map(topPostRecords.map((post) => [post.id, post]));

    const deviceRows = groupRows(devices.map((row) => ({
      name: row.device,
      count: row._count?._all || 0,
    })));
    const browserRows = groupRows(browsers.map((row) => ({
      name: row.browser,
      count: row._count?._all || 0,
    })));
    const sourceCounts = new Map<string, number>();
    let internalReferrals = 0;
    for (const row of refererRows) {
      const source = classifyReferer(row.referer, internalHosts);
      if (source === 'internal') {
        internalReferrals += 1;
        continue;
      }
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    }
    const sourceRows = Array.from(sourceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      period: { days },
      overview: {
        totalViews,
        totalSessions,
        avgDuration: Math.round(sessionStats._avg.duration || 0),
        avgPageViews: Number((sessionStats._avg.pageViews || 0).toFixed(1)),
      },
      changes: {
        totalViews: percentChange(totalViews, previousViews),
        totalSessions: percentChange(totalSessions, previousSessions),
        avgDuration: percentChange(
          Math.round(sessionStats._avg.duration || 0),
          Math.round(previousSessionStats._avg.duration || 0)
        ),
        avgPageViews: percentChange(
          Number((sessionStats._avg.pageViews || 0).toFixed(1)),
          Number((previousSessionStats._avg.pageViews || 0).toFixed(1))
        ),
      },
      trend: Array.from(buckets.entries()).map(([date, count]) => ({ date, count })),
      topPosts: topPostViews.map((row) => {
        const post = row.postId ? topPostById.get(row.postId) : null;
        return {
          postId: row.postId,
          slug: post?.slug || null,
          title: post?.title || '已删除文章',
          views: row._count._all,
        };
      }),
      devices: deviceRows,
      browsers: browserRows,
      referers: sourceRows,
      internalReferrals,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
