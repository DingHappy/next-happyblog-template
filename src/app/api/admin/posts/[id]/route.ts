import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { forbiddenResponse, getCurrentUser, unauthorizedResponse } from '@/lib/auth';
import { canManageAnyPost, canPublishDirectly } from '@/lib/permissions';
import { withAuditLog } from '@/lib/audit';
import { normalizePostSlug, slugifyTag, validatePostInput } from '@/lib/post-content';

async function buildUniquePostSlug(postId: string, title: string, requestedSlug?: string) {
  const base = normalizePostSlug(title, requestedSlug);
  let slug = base;
  let counter = 1;

  while (true) {
    const existingPost = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existingPost || existingPost.id === postId) {
      return slug;
    }
    slug = `${base}-${counter++}`;
  }
}

// 获取单篇文章
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        tags: true,
        author: { select: { id: true, username: true, displayName: true } },
        reviewer: { select: { id: true, username: true, displayName: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    if (!canManageAnyPost(user) && post.authorId !== user.id) {
      return forbiddenResponse();
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: '获取文章失败' },
      { status: 500 }
    );
  }
}

// 更新文章
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
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
    const slug = await buildUniquePostSlug(id, title, validation.normalized.slug);

    // 先获取当前文章，用于保存版本
    const currentPost = await prisma.post.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!currentPost) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    if (!canManageAnyPost(user) && currentPost.authorId !== user.id) {
      return forbiddenResponse();
    }

    // Author edits never change publish state — they must go through the
    // submit/review flow. Editor+ can flip published directly.
    const allowDirectPublish = canPublishDirectly(user);
    const nextPublished = allowDirectPublish
      ? (body.published ?? currentPost.published)
      : currentPost.published;
    const nextStatus = allowDirectPublish
      ? ((body.published ?? currentPost.published) ? 'published' : (currentPost.status === 'published' ? 'draft' : currentPost.status))
      : (currentPost.status === 'rejected' ? 'draft' : currentPost.status);
    const nextIsPinned = allowDirectPublish
      ? (body.isPinned ?? currentPost.isPinned)
      : currentPost.isPinned;
    const nextIsPublic = allowDirectPublish
      ? (body.isPublic ?? currentPost.isPublic)
      : currentPost.isPublic;

    // 保存当前状态为新版本（如果有内容变化）
    {
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
          tags: JSON.stringify(currentPost.tags.map(t => t.name)),
          version: nextVersion,
        },
      });
    }

    const post = await withAuditLog(
      { action: 'update', resource: 'post', resourceId: id },
      () => prisma.post.update({
        where: { id },
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
          published: nextPublished,
          status: nextStatus,
          isPublic: nextIsPublic,
          isPinned: nextIsPinned,
          scheduledAt: allowDirectPublish
            ? (body.scheduledAt ? new Date(body.scheduledAt) : null)
            : currentPost.scheduledAt,
          updatedAt: new Date(),
          tags: {
            set: [],
            connectOrCreate: tagNames.map(name => ({
              where: { slug: slugifyTag(name) },
              create: {
                name,
                slug: slugifyTag(name),
              },
            })),
          },
        },
        include: {
          tags: true,
        },
      }),
      () => ({ title: currentPost.title, published: currentPost.published, status: currentPost.status }),
      (result) => ({ id: result.id, title: result.title, published: result.published })
    );

    await prisma.postDraft.deleteMany({ where: { postId: id } });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: '更新文章失败' },
      { status: 500 }
    );
  }
}

// 删除文章
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;

    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, authorId: true },
    });

    if (!currentPost) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    if (!canManageAnyPost(user) && currentPost.authorId !== user.id) {
      return forbiddenResponse();
    }

    // 先删除评论
    await prisma.comment.deleteMany({
      where: { postId: id },
    });
    
    // 再删除文章
    await withAuditLog(
      { action: 'delete', resource: 'post', resourceId: id },
      () => prisma.post.delete({
        where: { id },
      }),
      () => currentPost
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: '删除文章失败' },
      { status: 500 }
    );
  }
}
