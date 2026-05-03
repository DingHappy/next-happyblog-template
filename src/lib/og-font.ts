// Loads a CJK-capable font for use with next/og's ImageResponse.
// satori (the engine behind ImageResponse) only accepts TTF/OTF, not woff2,
// so we cannot use Google Fonts CSS API directly. We pull the OTF from a
// public CDN and cache it in module scope. Returns null on failure so callers
// fall back to the system font without breaking the route.

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf';

let cached: ArrayBuffer | null | undefined;

export async function loadCjkFont(): Promise<ArrayBuffer | null> {
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(FONT_URL, { cache: 'force-cache' });
    if (!res.ok) {
      cached = null;
      return null;
    }
    cached = await res.arrayBuffer();
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
