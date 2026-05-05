import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;

  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: [
        { posts: { _count: 'desc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Get tags failed:', error);
    return NextResponse.json(
      { error: '获取标签失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;

  try {
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
        OR: [
          { name },
          { slug },
        ],
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: '标签名称或 slug 已存在' },
        { status: 400 }
      );
    }

    const tag = await withAuditLog(
      { action: 'create', resource: 'tag' },
      () => prisma.tag.create({
        data: { name, slug },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      undefined,
      (result) => ({ id: result.id, name: result.name })
    );

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Create tag failed:', error);
    return NextResponse.json(
      { error: '创建标签失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少标签 ID' },
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
    const knownError = error as { code?: string };
    if (knownError.code === 'P2025') {
      return NextResponse.json(
        { error: '标签不存在' },
        { status: 404 }
      );
    }
    console.error('Delete tag failed:', error);
    return NextResponse.json(
      { error: '删除标签失败' },
      { status: 500 }
    );
  }
}
