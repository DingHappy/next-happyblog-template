import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';

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
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || null;
}

function anonymize(value: string | null): string | null {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function validPath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path.slice(0, 512);
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
      sessionId?: string;
      viewId?: string;
      duration?: number;
    };
    const { event } = body;
    const path = validPath(body.path);
    const duration = Number.isFinite(body.duration) ? Math.max(0, Math.floor(body.duration || 0)) : 0;
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || null;
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

      await prisma.analyticsSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          visitorId,
          ip: anonymize(ip),
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
        },
        update: {
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
          ip: anonymize(ip),
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
