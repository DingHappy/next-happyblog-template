import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { slugify } from '@/lib/slug';

function parseVersionTags(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// 获取单个版本详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id, versionId } = await params;

    const version = await prisma.postVersion.findUnique({
      where: {
        id: versionId,
        postId: id,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    // 解析 tags JSON
    const versionWithTags = {
      ...version,
      tags: parseVersionTags(version.tags),
    };

    return NextResponse.json(versionWithTags);
  } catch (error) {
    console.error('Get post version error:', error);
    return NextResponse.json(
      { error: '获取文章版本失败' },
      { status: 500 }
    );
  }
}

// 回滚到指定版本
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id, versionId } = await params;

    const version = await prisma.postVersion.findUnique({
      where: {
        id: versionId,
        postId: id,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    const tags = parseVersionTags(version.tags);

    // 首先保存当前状态为新版本
    const currentPost = await prisma.post.findUnique({
      where: { id: id },
      include: { tags: true },
    });

    if (currentPost) {
      const maxVersion = await prisma.postVersion.aggregate({
        where: { postId: id },
        _max: { version: true },
      });
      const nextVersion = (maxVersion._max.version || 0) + 1;

      await prisma.postVersion.create({
        data: {
          postId: id,
          title: currentPost.title,
          slug: currentPost.slug,
          excerpt: currentPost.excerpt,
          content: currentPost.content,
          categoryId: currentPost.categoryId,
          coverImage: currentPost.coverImage,
          tags: JSON.stringify(currentPost.tags.map((t: { name: string }) => t.name)),
          version: nextVersion,
        },
      });
    }

    // 解析标签，连接或创建
    const tagConnectOrCreate = tags.map((name) => ({
      where: { slug: slugify(name) || name },
      create: {
        name,
        slug: slugify(name) || name,
      },
    }));

    // 更新文章到旧版本
    const updateData: Prisma.PostUpdateInput = {
      title: version.title,
      slug: version.slug,
      excerpt: version.excerpt ?? '',
      content: version.content,
      category: version.categoryId
        ? { connect: { id: version.categoryId } }
        : { disconnect: true },
      coverImage: version.coverImage,
      tags: {
        set: [],
        connectOrCreate: tagConnectOrCreate,
      },
      updatedAt: new Date(),
    };

    const updatedPost = await prisma.post.update({
      where: { id: id },
      data: updateData,
      include: { tags: true },
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Rollback post version error:', error);
    return NextResponse.json(
      { error: '回滚文章版本失败' },
      { status: 500 }
    );
  }
}
