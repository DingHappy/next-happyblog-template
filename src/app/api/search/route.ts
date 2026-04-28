import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const isAdmin = await requireAuth();

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const whereClause: Prisma.PostWhereInput = {
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
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
        category: true,
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

    return NextResponse.json({ results, total });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
