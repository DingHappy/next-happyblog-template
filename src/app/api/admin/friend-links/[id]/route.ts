import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, description, avatar, isVisible, order } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url;
    if (description !== undefined) data.description = description;
    if (avatar !== undefined) data.avatar = avatar;
    if (isVisible !== undefined) data.isVisible = isVisible;
    if (order !== undefined) data.order = parseInt(order) || 0;

    const link = await prisma.friendLink.update({
      where: { id },
      data,
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error('Update friend link error:', error);
    return NextResponse.json(
      { error: '更新友情链接失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    await prisma.friendLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete friend link error:', error);
    return NextResponse.json(
      { error: '删除友情链接失败' },
      { status: 500 }
    );
  }
}
