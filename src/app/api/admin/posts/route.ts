import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorizedResponse } from '@/lib/auth';
import { canManageAnyPost, canPublishDirectly } from '@/lib/permissions';
import { createAuditLog, withAuditLog } from '@/lib/audit';
import { normalizePostSlug, normalizeTagNames, slugifyTag, validatePostInput } from '@/lib/post-content';

async function buildUniquePostSlug(title: string, requestedSlug?: string) {
  const base = normalizePostSlug(title, requestedSlug);
  let slug = base;
  let counter = 1;

  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

// 获取文章列表
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const where: Prisma.PostWhereInput = canManageAnyPost(user)
      ? {}
      : { authorId: user.id };

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        isPublic: true,
        status: true,
        authorId: true,
        scheduledAt: true,
        createdAt: true,
        author: {
          select: { id: true, username: true, displayName: true },
        },
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
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const validation = validatePostInput(body);
    if (validation.errors.length > 0) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors, warnings: validation.warnings },
        { status: 400 }
      );
    }

    const {
      title,
      excerpt,
      content,
      tags: tagNames,
      seoTitle,
      seoDescription,
      canonicalUrl,
      ogImage,
      noIndex,
    } = validation.normalized;
    const slug = await buildUniquePostSlug(title, validation.normalized.slug);

    // Authors cannot publish directly — every new post starts as a draft until
    // explicitly submitted for review. Editors+ keep the existing behavior.
    const requestedPublished = body.published ?? true;
    const allowDirectPublish = canPublishDirectly(user);
    const published = allowDirectPublish ? requestedPublished : false;
    const status = allowDirectPublish
      ? (requestedPublished ? 'published' : 'draft')
      : 'draft';

    const post = await withAuditLog(
      { action: 'create', resource: 'post' },
      () => prisma.post.create({
        data: {
          title,
          slug,
          excerpt,
          content,
          categoryId: body.categoryId || null,
          coverImage: body.coverImage || null,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          canonicalUrl: canonicalUrl || null,
          ogImage: ogImage || null,
          noIndex,
          published,
          status,
          authorId: user.id,
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
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

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

    // Authors can only batch-operate on posts they own. Authors also cannot
    // publish/pin directly — those actions need editor+.
    if (!canManageAnyPost(user)) {
      const restrictedActions: BatchPostAction[] = ['publish', 'pin', 'unpin', 'public', 'private'];
      if (restrictedActions.includes(action)) {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
    }

    const requestedWhere: Prisma.PostWhereInput = canManageAnyPost(user)
      ? { id: { in: selectedPostIds } }
      : { id: { in: selectedPostIds }, authorId: user.id };
    const targetPosts = await prisma.post.findMany({
      where: requestedWhere,
      select: { id: true, title: true, published: true, status: true },
    });
    const targetPostIds = targetPosts.map((post) => post.id);
    const where: Prisma.PostWhereInput = { id: { in: targetPostIds } };

    if (targetPostIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: batchMessage(action, 0),
        count: 0,
      });
    }

    if (action === 'delete') {
      const [, , result] = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { postId: { in: targetPostIds } } }),
        prisma.postView.deleteMany({ where: { postId: { in: targetPostIds } } }),
        prisma.post.deleteMany({ where }),
      ]);
      await createAuditLog({
        action: 'delete',
        resource: 'post',
        newData: { action, count: result.count, ids: targetPostIds },
      });
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
      await createAuditLog({
        action: 'update',
        resource: 'post',
        newData: { action, count: result.count, ids: targetPostIds, categoryId },
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
      await createAuditLog({
        action: 'update',
        resource: 'post',
        newData: { action, count: result.count, ids: targetPostIds },
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

      await createAuditLog({
        action: 'update',
        resource: 'post',
        newData: {
          action,
          count: existingPosts.length,
          ids: existingPosts.map((post) => post.id),
          tags: tagNames,
        },
      });

      return NextResponse.json({
        success: true,
        message: batchMessage(action, existingPosts.length),
        count: existingPosts.length,
      });
    }

    const data: Prisma.PostUpdateManyMutationInput =
      action === 'publish'
        ? { published: true, status: 'published', scheduledAt: null }
        : action === 'draft' || action === 'unpublish'
          ? { published: false, status: 'draft', scheduledAt: null }
          : action === 'public'
            ? { isPublic: true }
            : action === 'private'
              ? { isPublic: false }
              : action === 'pin'
                ? { isPinned: true }
                : { isPinned: false };

    const result = await prisma.post.updateMany({ where, data });
    await createAuditLog({
      action: action === 'publish' ? 'publish' : action === 'unpublish' || action === 'draft' ? 'unpublish' : 'update',
      resource: 'post',
      newData: { action, count: result.count, ids: targetPostIds },
    });

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
