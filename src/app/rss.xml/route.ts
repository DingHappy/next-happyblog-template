import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';
import { siteConfig } from '@/config/site';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true, isPublic: true },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  const items = posts.map(post => {
    const url = absoluteUrl(`/posts/${post.slug || post.id}`);
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${escapeXml(url)}</link>
        <guid>${escapeXml(url)}</guid>
        <description>${escapeXml(post.excerpt)}</description>
        <pubDate>${post.createdAt.toUTCString()}</pubDate>
        <lastBuildDate>${post.updatedAt.toUTCString()}</lastBuildDate>
      </item>
    `;
  }).join('');

   const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${escapeXml(siteConfig.name)}</title>
        <link>${escapeXml(absoluteUrl('/'))}</link>
        <atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
        <description>${escapeXml(siteConfig.description)}</description>
        <language>${escapeXml(siteConfig.language)}</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>Next.js Blog Template</generator>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
