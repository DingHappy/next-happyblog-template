import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { slugify } from '@/lib/slug';

function normalizeTagNames(value: unknown): string[] {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const tagsBySlug = new Map<string, string>();
  for (const rawTag of rawTags) {
    const name = String(rawTag).trim();
    if (!name) continue;
    const slug = slugifyTag(name);
    if (!tagsBySlug.has(slug)) {
      tagsBySlug.set(slug, name);
    }
  }

  return Array.from(tagsBySlug.values());
}

function slugifyTag(name: string): string {
  return slugify(name) || name;
}

async function buildUniquePostSlug(title: string, requestedSlug?: string) {
  const base = slugify(requestedSlug || title) || `post-${Date.now()}`;
  let slug = base;
  let counter = 1;

  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

// 获取文章列表
export async function GET() {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        isPublic: true,
        scheduledAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// 创建文章
export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const body = await request.json();
    const tagNames = normalizeTagNames(body.tags);
    const slug = await buildUniquePostSlug(body.title, body.slug);

    const post = await withAuditLog(
      { action: 'create', resource: 'post' },
      () => prisma.post.create({
        data: {
          title: body.title,
          slug,
          excerpt: body.excerpt,
          content: body.content,
          categoryId: body.categoryId || null,
          coverImage: body.coverImage || null,
          published: body.published ?? true,
          isPublic: body.isPublic ?? true,
          isPinned: body.isPinned ?? false,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          tags: tagNames.length > 0 ? {
            connectOrCreate: tagNames.map(name => ({
              where: { slug: slugifyTag(name) },
              create: {
                name,
                slug: slugifyTag(name),
              },
            })),
          } : undefined,
        },
        include: {
          tags: true,
        },
      }),
      undefined,
      (result) => ({ id: result.id, title: result.title })
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    );
  }
}

type BatchPostAction =
  | 'publish'
  | 'draft'
  | 'unpublish'
  | 'public'
  | 'private'
  | 'pin'
  | 'unpin'
  | 'delete'
  | 'move-category'
  | 'clear-category'
  | 'set-tags'
  | 'add-tags'
  | 'remove-tags';

function isBatchPostAction(action: unknown): action is BatchPostAction {
  return (
    action === 'publish' ||
    action === 'draft' ||
    action === 'unpublish' ||
    action === 'public' ||
    action === 'private' ||
    action === 'pin' ||
    action === 'unpin' ||
    action === 'delete' ||
    action === 'move-category' ||
    action === 'clear-category' ||
    action === 'set-tags' ||
    action === 'add-tags' ||
    action === 'remove-tags'
  );
}

function batchMessage(action: BatchPostAction, count: number) {
  switch (action) {
    case 'publish':
      return `成功发布 ${count} 篇文章`;
    case 'draft':
    case 'unpublish':
      return `成功转为草稿 ${count} 篇文章`;
    case 'public':
      return `成功设为公开 ${count} 篇文章`;
    case 'private':
      return `成功设为不公开 ${count} 篇文章`;
    case 'pin':
      return `成功置顶 ${count} 篇文章`;
    case 'unpin':
      return `成功取消置顶 ${count} 篇文章`;
    case 'move-category':
      return `成功移动 ${count} 篇文章到指定分类`;
    case 'clear-category':
      return `成功清空 ${count} 篇文章的分类`;
    case 'set-tags':
      return `成功重设 ${count} 篇文章的标签`;
    case 'add-tags':
      return `成功为 ${count} 篇文章追加标签`;
    case 'remove-tags':
      return `成功从 ${count} 篇文章移除标签`;
    case 'delete':
      return `成功删除 ${count} 篇文章`;
  }
}

// 批量操作文章
export async function PATCH(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { action, ids, postIds, categoryId, tags } = await request.json();
    const rawIds = Array.isArray(ids) ? ids : postIds;

    if (!isBatchPostAction(action) || !Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    const selectedPostIds = rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (selectedPostIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要操作的文章' },
        { status: 400 }
      );
    }

    const where: Prisma.PostWhereInput = { id: { in: selectedPostIds } };

    if (action === 'delete') {
      const [, , result] = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { postId: { in: selectedPostIds } } }),
        prisma.postView.deleteMany({ where: { postId: { in: selectedPostIds } } }),
        prisma.post.deleteMany({ where }),
      ]);
      return NextResponse.json({
        success: true,
        message: batchMessage(action, result.count),
        count: result.count,
      });
    }

    if (action === 'move-category') {
      if (typeof categoryId !== 'string' || !categoryId) {
        return NextResponse.json(
          { error: '请选择目标分类' },
          { status: 400 }
        );
      }

      const result = await prisma.post.updateMany({
        where,
        data: { categoryId },
      });

      return NextResponse.json({
        success: true,
        message: batchMessage(action, result.count),
        count: result.count,
      });
    }

    if (action === 'clear-category') {
      const result = await prisma.post.updateMany({
        where,
        data: { categoryId: null },
      });

      return NextResponse.json({
        success: true,
        message: batchMessage(action, result.count),
        count: result.count,
      });
    }

    if (action === 'set-tags' || action === 'add-tags' || action === 'remove-tags') {
      const tagNames = normalizeTagNames(tags);
      if (tagNames.length === 0) {
        return NextResponse.json(
          { error: '请输入至少一个标签' },
          { status: 400 }
        );
      }

      const existingPosts = await prisma.post.findMany({
        where,
        select: { id: true },
      });

      if (existingPosts.length === 0) {
        return NextResponse.json({
          success: true,
          message: batchMessage(action, 0),
          count: 0,
        });
      }

      const tagRecords = await Promise.all(
        tagNames.map((name) =>
          prisma.tag.upsert({
            where: { slug: slugifyTag(name) },
            update: { name },
            create: {
              name,
              slug: slugifyTag(name),
            },
            select: { id: true },
          })
        )
      );

      if (action === 'set-tags') {
        await prisma.$transaction(
          existingPosts.map((post) =>
            prisma.post.update({
              where: { id: post.id },
              data: {
                tags: {
                  set: tagRecords.map((tag) => ({ id: tag.id })),
                },
              },
            })
          )
        );
      } else if (action === 'add-tags') {
        await prisma.$transaction(
          existingPosts.map((post) =>
            prisma.post.update({
              where: { id: post.id },
              data: {
                tags: {
                  connect: tagRecords.map((tag) => ({ id: tag.id })),
                },
              },
            })
          )
        );
      } else {
        await prisma.$transaction(
          existingPosts.map((post) =>
            prisma.post.update({
              where: { id: post.id },
              data: {
                tags: {
                  disconnect: tagRecords.map((tag) => ({ id: tag.id })),
                },
              },
            })
          )
        );
      }

      return NextResponse.json({
        success: true,
        message: batchMessage(action, existingPosts.length),
        count: existingPosts.length,
      });
    }

    const data: Prisma.PostUpdateManyMutationInput =
      action === 'publish'
        ? { published: true, scheduledAt: null }
        : action === 'draft' || action === 'unpublish'
          ? { published: false, scheduledAt: null }
          : action === 'public'
            ? { isPublic: true }
            : action === 'private'
              ? { isPublic: false }
              : action === 'pin'
                ? { isPinned: true }
                : { isPinned: false };

    const result = await prisma.post.updateMany({ where, data });

    return NextResponse.json({
      success: true,
      message: batchMessage(action, result.count),
      count: result.count,
    });
  } catch (error) {
    console.error('Batch posts operation error:', error);
    return NextResponse.json(
      { error: '批量操作失败' },
      { status: 500 }
    );
  }
}
