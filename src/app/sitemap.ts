import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

type SitemapPost = {
  id: string;
  slug: string;
  updatedAt: Date;
};

type SitemapCategory = {
  id: string;
  slug: string;
  updatedAt: Date;
};

type SitemapTag = {
  id: string;
  slug: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 构建时或 CI 环境，数据库不可用，返回基础 sitemap
  if (process.env.CI || process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return [
      {
        url: absoluteUrl('/'),
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
      },
      {
        url: absoluteUrl('/archives'),
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
      {
        url: absoluteUrl('/about'),
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      },
    ];
  }

  let posts: SitemapPost[] = [];
  let categories: SitemapCategory[] = [];
  let tags: SitemapTag[] = [];

  try {
    [posts, categories, tags] = await Promise.all([
      prisma.post.findMany({
        where: { published: true, isPublic: true },
        select: {
          id: true,
          slug: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          slug: true,
          updatedAt: true,
        },
      }),
      prisma.tag.findMany({
        select: {
          id: true,
          slug: true,
        },
      }),
    ]);
  } catch {
    // 数据库不可用时（比如构建阶段），只返回基础页面
    console.log('Database not available during build, returning basic sitemap');
  }

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
    ...categories.map(category => ({
      url: absoluteUrl(`/?categoryId=${category.id}`),
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...tags.map(tag => ({
      url: absoluteUrl(`/?tagId=${tag.id}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
