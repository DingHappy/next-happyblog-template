import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';
import { routing } from '@/i18n/routing';

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

function withLocaleAlternates(pathSuffix: string) {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, absoluteUrl(`/${locale}${pathSuffix}`)])
  );
  return {
    url: absoluteUrl(`/${routing.defaultLocale}${pathSuffix}`),
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseEntries: MetadataRoute.Sitemap = [
    {
      ...withLocaleAlternates(''),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      ...withLocaleAlternates('/archives'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      ...withLocaleAlternates('/about'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 构建时或 CI 环境，数据库不可用，返回基础 sitemap
  if (process.env.CI || process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    return baseEntries;
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
    console.log('Database not available during build, returning basic sitemap');
  }

  return [
    ...baseEntries,
    ...posts.map((post) => ({
      ...withLocaleAlternates(`/posts/${post.slug || post.id}`),
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...categories.map((category) => ({
      ...withLocaleAlternates(`?categoryId=${category.id}`),
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...tags.map((tag) => ({
      ...withLocaleAlternates(`?tagId=${tag.id}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
