import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';
import { loadCjkFont } from '@/lib/og-font';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const title = siteConfig.name;
  const subtitle = siteConfig.description;
  const font = await loadCjkFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #ec4899 100%)',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 48 }}>
          <span style={{ fontSize: 80, marginRight: 24 }}>{siteConfig.logoEmoji}</span>
          <span style={{ fontWeight: 700 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{subtitle}</div>
          <div style={{ fontSize: 28, opacity: 0.85 }}>
            {siteConfig.author?.tagline}
          </div>
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
