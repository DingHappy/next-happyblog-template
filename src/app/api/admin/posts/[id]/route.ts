import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
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
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
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
  if (!(await requireAuth())) return unauthorizedResponse();

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

    // 保存当前状态为新版本（如果有内容变化）
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
          published: body.published ?? true,
          isPublic: body.isPublic ?? true,
          isPinned: body.isPinned ?? false,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
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
      () => currentPost ? { title: currentPost.title, published: currentPost.published } : null,
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
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    
    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

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
