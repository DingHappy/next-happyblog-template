import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { siteConfig } from '@/config/site';
import { loadCjkFont } from '@/lib/og-font';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Post preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function formatDate(date: Date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = (() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  })();

  const post = await prisma.post
    .findFirst({
      where: {
        OR: [{ id: decoded }, { slug: decoded }],
        published: true,
        isPublic: true,
      },
      select: {
        title: true,
        createdAt: true,
        category: { select: { name: true, color: true } },
      },
    })
    .catch(() => null);

  const title = post?.title ?? siteConfig.name;
  const categoryName = post?.category?.name ?? '';
  const categoryColor = post?.category?.color ?? '#9333ea';
  const dateText = post ? formatDate(post.createdAt) : '';

  const font = await loadCjkFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          background: '#0f172a',
          color: 'white',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 8,
            background: 'linear-gradient(90deg, #4f46e5, #9333ea, #ec4899)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, opacity: 0.8 }}>
          <span style={{ fontSize: 44, marginRight: 16 }}>{siteConfig.logoEmoji}</span>
          <span>{siteConfig.name}</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            gap: 32,
          }}
        >
          {categoryName ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '8px 20px',
                borderRadius: 999,
                fontSize: 24,
                background: categoryColor,
                color: 'white',
              }}
            >
              {categoryName}
            </div>
          ) : null}
          <div
            style={{
              fontSize: title.length > 24 ? 64 : 76,
              fontWeight: 700,
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, opacity: 0.7 }}>
          <span>{dateText}</span>
          <span>{siteConfig.author?.name}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: 'NotoSansSC', data: font, style: 'normal', weight: 700 }]
        : undefined,
    },
  );
}
