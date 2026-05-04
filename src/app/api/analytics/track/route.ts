import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isIP } from 'net';
import IP2Region from 'ip2region';
import prisma from '@/lib/prisma';

type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const GEO_CACHE = new Map<string, { value: GeoInfo; expiresAt: number }>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let ip2RegionReader: IP2Region | null = null;

const CHINA_REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  北京市: { lat: 39.9042, lng: 116.4074 },
  北京: { lat: 39.9042, lng: 116.4074 },
  上海市: { lat: 31.2304, lng: 121.4737 },
  上海: { lat: 31.2304, lng: 121.4737 },
  天津市: { lat: 39.3434, lng: 117.3616 },
  天津: { lat: 39.3434, lng: 117.3616 },
  重庆市: { lat: 29.4316, lng: 106.9123 },
  重庆: { lat: 29.4316, lng: 106.9123 },
  河北省: { lat: 38.0428, lng: 114.5149 },
  山西省: { lat: 37.8706, lng: 112.5489 },
  辽宁省: { lat: 41.8057, lng: 123.4315 },
  吉林省: { lat: 43.8171, lng: 125.3235 },
  黑龙江省: { lat: 45.8038, lng: 126.5349 },
  江苏省: { lat: 32.0603, lng: 118.7969 },
  浙江省: { lat: 30.2741, lng: 120.1551 },
  安徽省: { lat: 31.8206, lng: 117.2272 },
  福建省: { lat: 26.0745, lng: 119.2965 },
  江西省: { lat: 28.682, lng: 115.8582 },
  山东省: { lat: 36.6512, lng: 117.1201 },
  河南省: { lat: 34.7466, lng: 113.6254 },
  湖北省: { lat: 30.5928, lng: 114.3055 },
  湖南省: { lat: 28.2282, lng: 112.9388 },
  广东省: { lat: 23.1291, lng: 113.2644 },
  海南省: { lat: 20.0442, lng: 110.1999 },
  四川省: { lat: 30.5728, lng: 104.0668 },
  贵州省: { lat: 26.647, lng: 106.6302 },
  云南省: { lat: 25.0389, lng: 102.7183 },
  陕西省: { lat: 34.3416, lng: 108.9398 },
  甘肃省: { lat: 36.0611, lng: 103.8343 },
  青海省: { lat: 36.6171, lng: 101.7782 },
  台湾省: { lat: 25.033, lng: 121.5654 },
  内蒙古自治区: { lat: 40.8175, lng: 111.7652 },
  广西壮族自治区: { lat: 22.817, lng: 108.3669 },
  西藏自治区: { lat: 29.65, lng: 91.1175 },
  宁夏回族自治区: { lat: 38.4872, lng: 106.2309 },
  新疆维吾尔自治区: { lat: 43.8256, lng: 87.6168 },
  香港: { lat: 22.3193, lng: 114.1694 },
  香港特别行政区: { lat: 22.3193, lng: 114.1694 },
  澳门: { lat: 22.1987, lng: 113.5439 },
  澳门特别行政区: { lat: 22.1987, lng: 113.5439 },
  深圳市: { lat: 22.5431, lng: 114.0579 },
  广州市: { lat: 23.1291, lng: 113.2644 },
  杭州市: { lat: 30.2741, lng: 120.1551 },
  南京市: { lat: 32.0603, lng: 118.7969 },
  苏州市: { lat: 31.2989, lng: 120.5853 },
  武汉市: { lat: 30.5928, lng: 114.3055 },
  成都市: { lat: 30.5728, lng: 104.0668 },
  西安市: { lat: 34.3416, lng: 108.9398 },
  厦门市: { lat: 24.4798, lng: 118.0894 },
  青岛市: { lat: 36.0671, lng: 120.3826 },
  郑州市: { lat: 34.7466, lng: 113.6254 },
  长沙市: { lat: 28.2282, lng: 112.9388 },
  合肥市: { lat: 31.8206, lng: 117.2272 },
  福州市: { lat: 26.0745, lng: 119.2965 },
  南昌市: { lat: 28.682, lng: 115.8582 },
  济南市: { lat: 36.6512, lng: 117.1201 },
  昆明市: { lat: 25.0389, lng: 102.7183 },
  沈阳市: { lat: 41.8057, lng: 123.4315 },
  大连市: { lat: 38.914, lng: 121.6147 },
  宁波市: { lat: 29.8683, lng: 121.544 },
  无锡市: { lat: 31.4912, lng: 120.3119 },
};

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  中国: { lat: 35.8617, lng: 104.1954 },
  美国: { lat: 37.0902, lng: -95.7129 },
  日本: { lat: 36.2048, lng: 138.2529 },
  韩国: { lat: 35.9078, lng: 127.7669 },
  新加坡: { lat: 1.3521, lng: 103.8198 },
  英国: { lat: 55.3781, lng: -3.436 },
  德国: { lat: 51.1657, lng: 10.4515 },
  法国: { lat: 46.2276, lng: 2.2137 },
  加拿大: { lat: 56.1304, lng: -106.3468 },
  澳大利亚: { lat: -25.2744, lng: 133.7751 },
  印度: { lat: 20.5937, lng: 78.9629 },
  巴西: { lat: -14.235, lng: -51.9253 },
};

function parseUserAgent(ua: string) {
  const device = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    ? /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile'
    : 'desktop';

  let browser = 'other';
  if (/Chrome/i.test(ua)) browser = 'chrome';
  else if (/Firefox/i.test(ua)) browser = 'firefox';
  else if (/Safari/i.test(ua)) browser = 'safari';
  else if (/Edge/i.test(ua)) browser = 'edge';

  let os = 'other';
  if (/Windows/i.test(ua)) os = 'windows';
  else if (/Mac/i.test(ua)) os = 'macos';
  else if (/Linux/i.test(ua)) os = 'linux';
  else if (/Android/i.test(ua)) os = 'android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'ios';

  const isBot = /bot|crawl|spider|curl|wget|headless/i.test(ua);

  return { device, browser, os, isBot };
}

function getIp(req: NextRequest): string | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-client-ip')
    || null;
  if (!ip || ip.length > 64 || !/^[a-f0-9:.,\s-]+$/i.test(ip)) return null;
  return ip;
}

function anonymize(value: string | null): string | null {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function cleanGeoValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded ? decoded.slice(0, 100) : null;
  } catch {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 100) : null;
  }
}

function cleanCoordinate(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function cleanCoordinateHeader(value: string | null) {
  if (!value) return null;
  return cleanCoordinate(Number(value));
}

function getGeoFromHeaders(req: NextRequest): GeoInfo {
  return {
    country: cleanGeoValue(
      req.headers.get('x-vercel-ip-country')
      || req.headers.get('cf-ipcountry')
      || req.headers.get('x-geo-country')
    ),
    region: cleanGeoValue(
      req.headers.get('x-vercel-ip-country-region')
      || req.headers.get('x-geo-region')
    ),
    city: cleanGeoValue(
      req.headers.get('x-vercel-ip-city')
      || req.headers.get('x-geo-city')
    ),
    latitude: cleanCoordinateHeader(
      req.headers.get('x-vercel-ip-latitude')
      || req.headers.get('x-geo-latitude')
    ),
    longitude: cleanCoordinateHeader(
      req.headers.get('x-vercel-ip-longitude')
      || req.headers.get('x-geo-longitude')
    ),
  };
}

function hasGeo(geo: GeoInfo) {
  return Boolean(
    geo.country
    || geo.region
    || geo.city
    || (typeof geo.latitude === 'number' && typeof geo.longitude === 'number')
  );
}

function isPublicIp(ip: string | null) {
  if (!ip || isIP(ip) === 0) return false;

  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return !(
      normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80:')
    );
  }

  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;

  return !(
    a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || a === 0
  );
}

function buildGeoLookupUrl(ip: string) {
  const customEndpoint = process.env.ANALYTICS_GEOIP_ENDPOINT;
  if (customEndpoint) return customEndpoint.replace('{ip}', encodeURIComponent(ip));

  if (process.env.ANALYTICS_GEOIP_PROVIDER === 'ipapi') {
    return `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
  }

  return null;
}

function emptyGeo(): GeoInfo {
  return { country: null, region: null, city: null, latitude: null, longitude: null };
}

function getIp2RegionReader() {
  ip2RegionReader ??= new IP2Region({
    ipv4db: process.env.ANALYTICS_IP2REGION_IPV4_DB || undefined,
    ipv6db: process.env.ANALYTICS_IP2REGION_IPV6_DB || undefined,
    disableIpv6: process.env.ANALYTICS_IP2REGION_DISABLE_IPV6 === 'true',
  });
  return ip2RegionReader;
}

function getIp2RegionCoords(country: string | null, region: string | null, city: string | null) {
  if (city && CHINA_REGION_COORDS[city]) return CHINA_REGION_COORDS[city];
  if (region && CHINA_REGION_COORDS[region]) return CHINA_REGION_COORDS[region];
  if (country && COUNTRY_COORDS[country]) return COUNTRY_COORDS[country];
  return { lat: null, lng: null };
}

function normalizeIp2RegionCountry(country: string | null) {
  if (!country || country === '0') return null;
  if (country === '中国') return 'CN';
  if (country === '香港') return 'HK';
  if (country === '台湾') return 'TW';
  if (country === '澳门') return 'MO';
  return country;
}

async function lookupIp2RegionByIp(ip: string | null): Promise<GeoInfo> {
  if (!isPublicIp(ip)) return emptyGeo();

  try {
    const result = getIp2RegionReader().search(ip as string);
    if (!result) return emptyGeo();

    const country = cleanGeoValue(normalizeIp2RegionCountry(result.country));
    const region = cleanGeoValue(result.province === '0' ? null : result.province);
    const city = cleanGeoValue(result.city === '0' ? null : result.city);
    const coords = getIp2RegionCoords(result.country, result.province, result.city);

    return {
      country,
      region,
      city,
      latitude: coords.lat,
      longitude: coords.lng,
    };
  } catch {
    return emptyGeo();
  }
}

function parseGeoResponse(data: unknown): GeoInfo {
  if (!data || typeof data !== 'object') {
    return emptyGeo();
  }

  const record = data as Record<string, unknown>;
  return {
    country: cleanGeoValue(record.country_code)
      || cleanGeoValue(record.countryCode)
      || cleanGeoValue(record.country)
      || cleanGeoValue(record.country_name),
    region: cleanGeoValue(record.region)
      || cleanGeoValue(record.regionName)
      || cleanGeoValue(record.region_name),
    city: cleanGeoValue(record.city),
    latitude: cleanCoordinate(record.latitude)
      || cleanCoordinate(record.lat),
    longitude: cleanCoordinate(record.longitude)
      || cleanCoordinate(record.lon)
      || cleanCoordinate(record.lng),
  };
}

async function lookupRemoteGeoByIp(ip: string | null): Promise<GeoInfo> {
  if (!isPublicIp(ip)) return emptyGeo();

  const cacheKey = ip as string;
  const cached = GEO_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = buildGeoLookupUrl(cacheKey);
  if (!url) return emptyGeo();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return emptyGeo();

    const geo = parseGeoResponse(await res.json());
    if (hasGeo(geo)) {
      GEO_CACHE.set(cacheKey, { value: geo, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
    }
    return geo;
  } catch {
    return emptyGeo();
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveGeo(req: NextRequest, ip: string | null) {
  const ip2RegionGeo = await lookupIp2RegionByIp(ip);
  if (hasGeo(ip2RegionGeo)) return ip2RegionGeo;

  const headerGeo = getGeoFromHeaders(req);
  if (hasGeo(headerGeo)) return headerGeo;

  return lookupRemoteGeoByIp(ip);
}

function validPath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path.slice(0, 512);
}

function validReferrer(referrer: unknown): string | null {
  if (typeof referrer !== 'string') return null;
  const value = referrer.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString().slice(0, 1024);
  } catch {
    return null;
  }
}

function trackingResponse(
  body: Record<string, unknown>,
  visitorId: string,
  sessionId: string
) {
  const response = NextResponse.json(body);
  response.cookies.set('visitor_id', visitorId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  response.cookies.set('analytics_session_id', sessionId, {
    path: '/',
    maxAge: 60 * 30,
    sameSite: 'lax',
  });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      event?: string;
      postId?: string;
      path?: string;
      referrer?: string;
      sessionId?: string;
      viewId?: string;
      duration?: number;
    };
    const { event } = body;
    const path = validPath(body.path);
    const duration = Number.isFinite(body.duration) ? Math.max(0, Math.floor(body.duration || 0)) : 0;
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') || '';
    const referer = validReferrer(body.referrer) || req.headers.get('referer') || null;
    const { device, browser, os, isBot } = parseUserAgent(ua);

    if (isBot) {
      return NextResponse.json({ success: true, isBot: true });
    }

    let visitorId = req.cookies.get('visitor_id')?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    let sessionId = body.sessionId || req.cookies.get('analytics_session_id')?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const response = () => trackingResponse({ success: true, sessionId }, visitorId, sessionId);

    if (event === 'page_view' || event === 'page_duration') {
      const slugOrId = typeof body.postId === 'string' ? body.postId : null;
      const post = slugOrId
        ? await prisma.post.findFirst({
            where: {
              OR: [{ id: slugOrId }, { slug: slugOrId }],
              published: true,
              isPublic: true,
            },
            select: { id: true },
          })
        : null;

      if (event === 'page_duration') {
        if (duration > 0) {
          await prisma.analyticsSession.update({
            where: { id: sessionId },
            data: {
              exitPath: path,
              duration: { increment: duration },
              updatedAt: new Date(),
            },
          }).catch(() => {});

          if (typeof body.viewId === 'string' && body.viewId) {
            await prisma.postView.update({
              where: { id: body.viewId },
              data: { duration },
            }).catch(() => {});
          } else {
            const latestView = await prisma.postView.findFirst({
              where: {
                sessionId,
                path,
                ...(post ? { postId: post.id } : {}),
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            });
            if (latestView) {
              await prisma.postView.update({
                where: { id: latestView.id },
                data: { duration },
              }).catch(() => {});
            }
          }
        }

        return response();
      }

      const geo = await resolveGeo(req, ip);
      const geoUpdate = Object.fromEntries(
        Object.entries(geo).filter(([, value]) => Boolean(value))
      );

      await prisma.analyticsSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          visitorId,
          ip,
          userAgent: anonymize(ua),
          referer,
          entryPath: path,
          exitPath: path,
          duration: 0,
          pageViews: 1,
          device,
          browser,
          os,
          isBot: false,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
        update: {
          ip,
          ...geoUpdate,
          exitPath: path,
          duration: { increment: duration },
          pageViews: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      const postView = await prisma.postView.create({
        data: {
          postId: post?.id,
          sessionId,
          ip,
          userAgent: anonymize(ua),
          referer,
          path,
          duration: 0,
        },
        select: { id: true },
      });

      if (post) {
        await prisma.post.update({
          where: { id: post.id },
          data: { viewCount: { increment: 1 } },
        });
      }

      return trackingResponse({ success: true, sessionId, viewId: postView.id }, visitorId, sessionId);
    }

    return response();
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
