import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    const slug = slugify(String(body.slug || name));

    if (!name || !slug) {
      return NextResponse.json(
        { error: '标签名称和 slug 不能为空' },
        { status: 400 }
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { name },
              { slug },
            ],
          },
        ],
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: '标签名称或 slug 已存在' },
        { status: 400 }
      );
    }

    const oldTag = await prisma.tag.findUnique({ where: { id } });

    const tag = await withAuditLog(
      { action: 'update', resource: 'tag', resourceId: id },
      () => prisma.tag.update({
        where: { id },
        data: { name, slug },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      () => oldTag ? { name: oldTag.name } : null,
      (result) => ({ id: result.id, name: result.name })
    );

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Update tag failed:', error);
    return NextResponse.json(
      { error: '更新标签失败' },
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
    const postCount = await prisma.post.count({
      where: {
        tags: {
          some: { id },
        },
      },
    });

    if (postCount > 0) {
      return NextResponse.json(
        { error: `该标签仍被 ${postCount} 篇文章使用，不能删除` },
        { status: 400 }
      );
    }

    const oldTag = await prisma.tag.findUnique({ where: { id } });

    await withAuditLog(
      { action: 'delete', resource: 'tag', resourceId: id },
      () => prisma.tag.delete({ where: { id } }),
      () => oldTag ? { name: oldTag.name } : null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag failed:', error);
    return NextResponse.json(
      { error: '删除标签失败' },
      { status: 500 }
    );
  }
}
