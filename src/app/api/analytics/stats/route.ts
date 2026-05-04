import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_TIME_ZONE = process.env.ANALYTICS_TIME_ZONE || 'Asia/Shanghai';
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  CN: { lat: 35.8617, lng: 104.1954 },
  HK: { lat: 22.3193, lng: 114.1694 },
  MO: { lat: 22.1987, lng: 113.5439 },
  TW: { lat: 23.6978, lng: 120.9605 },
  JP: { lat: 36.2048, lng: 138.2529 },
  KR: { lat: 35.9078, lng: 127.7669 },
  SG: { lat: 1.3521, lng: 103.8198 },
  US: { lat: 37.0902, lng: -95.7129 },
  CA: { lat: 56.1304, lng: -106.3468 },
  GB: { lat: 55.3781, lng: -3.436 },
  DE: { lat: 51.1657, lng: 10.4515 },
  FR: { lat: 46.2276, lng: 2.2137 },
  NL: { lat: 52.1326, lng: 5.2913 },
  AU: { lat: -25.2744, lng: 133.7751 },
  IN: { lat: 20.5937, lng: 78.9629 },
  BR: { lat: -14.235, lng: -51.9253 },
  MX: { lat: 23.6345, lng: -102.5528 },
  AR: { lat: -38.4161, lng: -63.6167 },
  CL: { lat: -35.6751, lng: -71.543 },
  CO: { lat: 4.5709, lng: -74.2973 },
  PE: { lat: -9.19, lng: -75.0152 },
  ES: { lat: 40.4637, lng: -3.7492 },
  IT: { lat: 41.8719, lng: 12.5674 },
  PT: { lat: 39.3999, lng: -8.2245 },
  IE: { lat: 53.1424, lng: -7.6921 },
  CH: { lat: 46.8182, lng: 8.2275 },
  SE: { lat: 60.1282, lng: 18.6435 },
  NO: { lat: 60.472, lng: 8.4689 },
  FI: { lat: 61.9241, lng: 25.7482 },
  DK: { lat: 56.2639, lng: 9.5018 },
  PL: { lat: 51.9194, lng: 19.1451 },
  RU: { lat: 61.524, lng: 105.3188 },
  TR: { lat: 38.9637, lng: 35.2433 },
  IL: { lat: 31.0461, lng: 34.8516 },
  AE: { lat: 23.4241, lng: 53.8478 },
  SA: { lat: 23.8859, lng: 45.0792 },
  TH: { lat: 15.87, lng: 100.9925 },
  VN: { lat: 14.0583, lng: 108.2772 },
  MY: { lat: 4.2105, lng: 101.9758 },
  ID: { lat: -0.7893, lng: 113.9213 },
  PH: { lat: 12.8797, lng: 121.774 },
  NZ: { lat: -40.9006, lng: 174.886 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  EG: { lat: 26.8206, lng: 30.8025 },
  NG: { lat: 9.082, lng: 8.6753 },
};

const LOCATION_ALIASES: Record<string, string> = {
  CHINA: 'CN',
  中国: 'CN',
  'HONG KONG': 'HK',
  香港: 'HK',
  香港特别行政区: 'HK',
  MACAU: 'MO',
  MACAO: 'MO',
  澳门: 'MO',
  澳门特别行政区: 'MO',
  TAIWAN: 'TW',
  台湾: 'TW',
  台湾省: 'TW',
  JAPAN: 'JP',
  日本: 'JP',
  KOREA: 'KR',
  韩国: 'KR',
  SINGAPORE: 'SG',
  新加坡: 'SG',
  'UNITED STATES': 'US',
  USA: 'US',
  美国: 'US',
  CANADA: 'CA',
  加拿大: 'CA',
  'UNITED KINGDOM': 'GB',
  UK: 'GB',
  英国: 'GB',
  GERMANY: 'DE',
  德国: 'DE',
  FRANCE: 'FR',
  法国: 'FR',
  NETHERLANDS: 'NL',
  AUSTRALIA: 'AU',
  INDIA: 'IN',
  BRAZIL: 'BR',
  MEXICO: 'MX',
  ARGENTINA: 'AR',
  CHILE: 'CL',
  COLOMBIA: 'CO',
  PERU: 'PE',
  SPAIN: 'ES',
  ITALY: 'IT',
  PORTUGAL: 'PT',
  IRELAND: 'IE',
  SWITZERLAND: 'CH',
  SWEDEN: 'SE',
  NORWAY: 'NO',
  FINLAND: 'FI',
  DENMARK: 'DK',
  POLAND: 'PL',
  RUSSIA: 'RU',
  TURKEY: 'TR',
  ISRAEL: 'IL',
  'UNITED ARAB EMIRATES': 'AE',
  'SAUDI ARABIA': 'SA',
  THAILAND: 'TH',
  VIETNAM: 'VN',
  MALAYSIA: 'MY',
  INDONESIA: 'ID',
  PHILIPPINES: 'PH',
  'NEW ZEALAND': 'NZ',
  'SOUTH AFRICA': 'ZA',
  EGYPT: 'EG',
  NIGERIA: 'NG',
};

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

function formatLocation(row: { country: string | null; region: string | null; city: string | null }) {
  const parts = [row.country, row.region, row.city]
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' / ') : 'unknown';
}

function getLocationCoords(country: string | null) {
  if (!country) return { lat: null, lng: null };
  const key = country.trim().toUpperCase();
  const normalized = LOCATION_ALIASES[key] || key;
  const coords = LOCATION_COORDS[normalized];
  return coords ? { lat: coords.lat, lng: coords.lng } : { lat: null, lng: null };
}

function getResolvedLocationCoords(row: {
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  if (typeof row.latitude === 'number' && typeof row.longitude === 'number') {
    return { lat: row.latitude, lng: row.longitude };
  }

  return getLocationCoords(row.country);
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
  if (host.endsWith('google.com.hk')) return 'google';
  if (host.endsWith('google.com.tw')) return 'google';
  if (host.endsWith('baidu.com')) return 'baidu';
  if (host.endsWith('bing.com')) return 'bing';
  if (host.endsWith('duckduckgo.com')) return 'duckduckgo';
  if (host.endsWith('github.com')) return 'github';
  if (host.endsWith('zhihu.com')) return 'zhihu';
  if (host.endsWith('x.com') || host.endsWith('twitter.com')) return 'x';
  if (host.endsWith('weibo.com')) return 'weibo';
  if (host.endsWith('juejin.cn')) return 'juejin';
  if (host.endsWith('linkedin.com')) return 'linkedin';
  if (host.endsWith('facebook.com')) return 'facebook';
  return host;
}

function getCampaignSource(path: string | null) {
  if (!path) return null;
  try {
    const params = new URL(path, 'https://local.invalid').searchParams;
    const source = params.get('utm_source') || params.get('source') || params.get('ref');
    if (!source) return null;
    return source.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60) || null;
  } catch {
    return null;
  }
}

function classifyReferer(
  referer: string | null,
  internalHosts: Set<string>,
  path: string | null = null
) {
  const campaignSource = getCampaignSource(path);
  if (campaignSource) return campaignSource;

  const host = getHost(referer);
  if (!host) return 'direct';
  if (internalHosts.has(host)) return 'internal';
  return normalizeSourceHost(host);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function getLocationSessions(since: Date) {
  return prisma.analyticsSession.findMany({
    where: { createdAt: { gte: since }, isBot: false },
    select: { country: true, region: true, city: true, latitude: true, longitude: true },
  }).catch(async () => {
    const rows = await prisma.analyticsSession.findMany({
      where: { createdAt: { gte: since }, isBot: false },
      select: { country: true, region: true, city: true },
    });
    return rows.map((row) => ({ ...row, latitude: null, longitude: null }));
  });
}

export async function GET(req: Request) {
  const auth = await requirePermission('analytics:read');
  if (!auth.ok) return auth.response;

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
      locationSessions,
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
      getLocationSessions(since),
      prisma.postView.findMany({
        where: { createdAt: { gte: since } },
        select: { referer: true, path: true },
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
    const locationCounts = new Map<string, {
      name: string;
      count: number;
      lat: number | null;
      lng: number | null;
    }>();
    for (const row of locationSessions) {
      const location = formatLocation(row);
      const coords = getResolvedLocationCoords(row);
      const key = `${location}|${coords.lat ?? ''}|${coords.lng ?? ''}`;
      const current = locationCounts.get(key);
      locationCounts.set(key, {
        name: location,
        count: (current?.count || 0) + 1,
        ...coords,
      });
    }
    const locationRows = Array.from(locationCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const sourceCounts = new Map<string, number>();
    let internalReferrals = 0;
    for (const row of refererRows) {
      const source = classifyReferer(row.referer, internalHosts, row.path);
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
      locations: locationRows,
      referers: sourceRows,
      internalReferrals,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
