import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { published: true, isPublic: true },
    select: {
      id: true,
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/archives'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...posts.map(post => ({
      url: absoluteUrl(`/posts/${post.slug || post.id}`),
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
