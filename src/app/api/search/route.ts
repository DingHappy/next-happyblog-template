import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

function tokenize(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

function includesText(value: string | null | undefined, keyword: string) {
  return String(value || '').toLowerCase().includes(keyword);
}

function buildSnippet(content: string, keywords: string[], fallback: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const firstIndex = keywords
    .map((keyword) => lower.indexOf(keyword))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstIndex === undefined) return fallback;

  const start = Math.max(0, firstIndex - 60);
  const end = Math.min(normalized.length, firstIndex + 140);
  return `${start > 0 ? '...' : ''}${normalized.slice(start, end)}${end < normalized.length ? '...' : ''}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const isAdmin = await requireAuth();

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const keywords = tokenize(query);
    const whereClause: Prisma.PostWhereInput = {
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
      OR: [
        { title: { contains: query.trim(), mode: 'insensitive' } },
        { excerpt: { contains: query.trim(), mode: 'insensitive' } },
        { content: { contains: query.trim(), mode: 'insensitive' } },
        { tags: { some: { name: { contains: query.trim(), mode: 'insensitive' } } } },
        { category: { name: { contains: query.trim(), mode: 'insensitive' } } },
      ],
    };

    if (category) {
      whereClause.categoryId = category;
    }

    const results = await prisma.post.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        category: true,
        tags: true,
        coverImage: true,
        createdAt: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    const total = await prisma.post.count({ where: whereClause });
    const rankedResults = results
      .map((post) => {
        const matchedFields = new Set<string>();
        let score = 0;

        for (const keyword of keywords) {
          if (includesText(post.title, keyword)) {
            score += 8;
            matchedFields.add('title');
          }
          if (includesText(post.excerpt, keyword)) {
            score += 4;
            matchedFields.add('excerpt');
          }
          if (includesText(post.category?.name, keyword)) {
            score += 3;
            matchedFields.add('category');
          }
          if (post.tags.some((tag) => includesText(tag.name, keyword))) {
            score += 3;
            matchedFields.add('tags');
          }
          if (includesText(post.content, keyword)) {
            score += 1;
            matchedFields.add('content');
          }
        }

        return {
          ...post,
          content: undefined,
          score,
          matchedFields: Array.from(matchedFields),
          snippet: buildSnippet(post.content, keywords, post.excerpt),
        };
      })
      .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime());

    const [suggestedCategories, suggestedTags] = await Promise.all([
      prisma.category.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      prisma.tag.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      results: rankedResults,
      total,
      suggestions: {
        categories: suggestedCategories,
        tags: suggestedTags,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
