import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { normalizeTagNames } from '@/lib/post-content';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableString(value: unknown): string | null {
  const text = readString(value);
  return text || null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readDate(value: unknown): Date | null {
  const text = readString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    const draft = await prisma.postDraft.findUnique({ where: { postId: id } });
    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Get post draft error:', error);
    return NextResponse.json(
      { error: '获取自动草稿失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const title = readString(body.title);
    const content = readString(body.content);

    if (!title && !content) {
      return NextResponse.json(
        { error: '草稿内容不能为空' },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    const draft = await prisma.postDraft.upsert({
      where: { postId: id },
      create: {
        postId: id,
        title,
        slug: readNullableString(body.slug),
        excerpt: readNullableString(body.excerpt),
        content,
        categoryId: readNullableString(body.categoryId),
        coverImage: readNullableString(body.coverImage),
        tags: JSON.stringify(normalizeTagNames(body.tags)),
        seoTitle: readNullableString(body.seoTitle),
        seoDescription: readNullableString(body.seoDescription),
        canonicalUrl: readNullableString(body.canonicalUrl),
        ogImage: readNullableString(body.ogImage),
        noIndex: readBoolean(body.noIndex, false),
        published: readBoolean(body.published, true),
        isPublic: readBoolean(body.isPublic, true),
        isPinned: readBoolean(body.isPinned, false),
        scheduledAt: readDate(body.scheduledAt),
      },
      update: {
        title,
        slug: readNullableString(body.slug),
        excerpt: readNullableString(body.excerpt),
        content,
        categoryId: readNullableString(body.categoryId),
        coverImage: readNullableString(body.coverImage),
        tags: JSON.stringify(normalizeTagNames(body.tags)),
        seoTitle: readNullableString(body.seoTitle),
        seoDescription: readNullableString(body.seoDescription),
        canonicalUrl: readNullableString(body.canonicalUrl),
        ogImage: readNullableString(body.ogImage),
        noIndex: readBoolean(body.noIndex, false),
        published: readBoolean(body.published, true),
        isPublic: readBoolean(body.isPublic, true),
        isPinned: readBoolean(body.isPinned, false),
        scheduledAt: readDate(body.scheduledAt),
      },
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Save post draft error:', error);
    return NextResponse.json(
      { error: '自动保存失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    await prisma.postDraft.deleteMany({ where: { postId: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post draft error:', error);
    return NextResponse.json(
      { error: '删除自动草稿失败' },
      { status: 500 }
    );
  }
}
