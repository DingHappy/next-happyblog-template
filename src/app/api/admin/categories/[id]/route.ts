import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;
  
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, color, parentId, order } = body;

    const existingCategory = await prisma.category.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { slug },
              { name, parentId: parentId || null }
            ]
          }
        ]
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: '分类名称或slug已存在' },
        { status: 400 }
      );
    }

    if (parentId === id) {
      return NextResponse.json(
        { error: '不能将自己设为父分类' },
        { status: 400 }
      );
    }

    const oldCategory = await prisma.category.findUnique({ where: { id } });

    const category = await withAuditLog(
      { action: 'update', resource: 'category', resourceId: id },
      () => prisma.category.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          color,
          parentId: parentId === '' ? null : parentId,
          order: order !== undefined ? order : undefined
        }
      }),
      () => oldCategory ? { name: oldCategory.name } : null,
      (result) => ({ id: result.id, name: result.name })
    );

    return NextResponse.json(category);
  } catch (error) {
    console.error('Update category failed:', error);
    return NextResponse.json(
      { error: '更新分类失败' },
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

    const oldCategory = await prisma.category.findUnique({ where: { id } });

    await withAuditLog(
      { action: 'delete', resource: 'category', resourceId: id },
      () => prisma.category.delete({ where: { id } }),
      () => oldCategory ? { name: oldCategory.name } : null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category failed:', error);
    return NextResponse.json(
      { error: '删除分类失败' },
      { status: 500 }
    );
  }
}
