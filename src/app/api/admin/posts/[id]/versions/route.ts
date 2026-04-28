import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';

// 获取文章的所有版本
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;

    const versions = await prisma.postVersion.findMany({
      where: { postId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Get post versions error:', error);
    return NextResponse.json(
      { error: '获取文章版本失败' },
      { status: 500 }
    );
  }
}

// 创建新版本
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();

    // 获取当前最大版本号
    const maxVersion = await prisma.postVersion.aggregate({
      where: { postId: id },
      _max: { version: true },
    });

    const nextVersion = (maxVersion._max.version || 0) + 1;

    const version = await prisma.postVersion.create({
      data: {
        postId: id,
        title: body.title,
        slug: body.slug || '',
        excerpt: body.excerpt || null,
        content: body.content,
        categoryId: body.categoryId || null,
        coverImage: body.coverImage || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        version: nextVersion,
      },
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Create post version error:', error);
    return NextResponse.json(
      { error: '创建文章版本失败' },
      { status: 500 }
    );
  }
}