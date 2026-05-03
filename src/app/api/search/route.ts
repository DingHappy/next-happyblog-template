import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const RESULT_LIMIT = 20;

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

// Use pg_trgm similarity + ILIKE (both index-backed by GIN trigram).
// Returns ranked post IDs with a similarity score. Throws if pg_trgm
// is missing — caller handles fallback.
async function searchPostIdsWithTrigram(
  query: string,
  isAdmin: boolean,
  categoryId: string | null,
): Promise<{ id: string; similarity: number }[]> {
  const visibilityClause = isAdmin
    ? Prisma.empty
    : Prisma.sql`AND "isPublic" = true`;
  const categoryClause = categoryId
    ? Prisma.sql`AND "categoryId" = ${categoryId}`
    : Prisma.empty;

  return prisma.$queryRaw<{ id: string; similarity: number }[]>`
    SELECT id,
      GREATEST(
        similarity(title, ${query}) * 3,
        similarity(COALESCE(excerpt, ''), ${query}) * 1.5,
        similarity(COALESCE(content, ''), ${query})
      )::float AS similarity
    FROM "Post"
    WHERE published = true
      ${visibilityClause}
      ${categoryClause}
      AND (
        title ILIKE '%' || ${query} || '%'
        OR excerpt ILIKE '%' || ${query} || '%'
        OR content ILIKE '%' || ${query} || '%'
        OR title % ${query}
      )
    ORDER BY similarity DESC, "createdAt" DESC
    LIMIT ${RESULT_LIMIT}
  `;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');
  const category = searchParams.get('category');
  const isAdmin = await requireAuth();

  if (!rawQuery || rawQuery.trim().length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const query = rawQuery.trim();
  const keywords = tokenize(query);

  try {
    let candidateIds: { id: string; similarity: number }[] = [];
    let usedTrigram = true;

    try {
      candidateIds = await searchPostIdsWithTrigram(query, isAdmin, category);
    } catch (err) {
      // pg_trgm not installed (extension missing) or similar — fall back
      // to a Prisma-only OR-contains query so search still works pre-migration.
      usedTrigram = false;
      console.warn('[search] trigram path unavailable, falling back', err);
    }

    let posts: LoadedPost[] = [];
    let total = 0;

    if (usedTrigram) {
      const ids = candidateIds.map((row) => row.id);
      total = await prisma.post.count({
        where: buildFallbackWhere(query, isAdmin, category),
      });
      posts = ids.length
        ? await prisma.post.findMany({
            where: { id: { in: ids } },
            select: postSelect,
          })
        : [];
      // Restore similarity ordering returned by SQL.
      const rank = new Map(ids.map((id, idx) => [id, idx]));
      posts.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    } else {
      const where = buildFallbackWhere(query, isAdmin, category);
      [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          select: postSelect,
          orderBy: { createdAt: 'desc' },
          take: RESULT_LIMIT,
        }),
        prisma.post.count({ where }),
      ]);
    }

    const similarityById = new Map(candidateIds.map((row) => [row.id, row.similarity]));
    const rankedResults = posts
      .map((post) => {
        const matchedFields = new Set<string>();
        let score = (similarityById.get(post.id) ?? 0) * 10;

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
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      prisma.tag.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      results: rankedResults,
      total,
      engine: usedTrigram ? 'trigram' : 'ilike',
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

const postSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  category: true,
  tags: true,
  coverImage: true,
  createdAt: true,
  _count: { select: { comments: true } },
} satisfies Prisma.PostSelect;

type LoadedPost = Prisma.PostGetPayload<{ select: typeof postSelect }>;

function buildFallbackWhere(
  query: string,
  isAdmin: boolean,
  category: string | null,
): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {
    published: true,
    ...(isAdmin ? {} : { isPublic: true }),
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } },
      { category: { name: { contains: query, mode: 'insensitive' } } },
    ],
  };
  if (category) where.categoryId = category;
  return where;
}
