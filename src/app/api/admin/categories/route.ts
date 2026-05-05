import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        posts: true;
      };
    };
  };
}>;

type CategoryTree = CategoryWithCount & {
  children: CategoryTree[];
};

async function buildCategoryTree(parentId: string | null = null): Promise<CategoryTree[]> {
  const categories = await prisma.category.findMany({
    where: { parentId },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { posts: true }
      }
    }
  });

  const result: CategoryTree[] = [];
  for (const cat of categories) {
    const children = await buildCategoryTree(cat.id);
    const childPostCount = children.reduce((sum, c) => sum + c._count.posts, 0);
    result.push({ 
      ...cat, 
      children,
      _count: { posts: cat._count.posts + childPostCount }
    });
  }
  return result;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  
  try {
    const tree = await buildCategoryTree(null);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Get categories failed:', error);
    return NextResponse.json(
      { error: '获取分类失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission('taxonomy:manage');
  if (!auth.ok) return auth.response;
  
  try {
    const body = await request.json();
    const { name, slug, description, color, parentId } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: '分类名称和slug不能为空' },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name, parentId: parentId || null }
        ]
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: '分类名称或slug已存在' },
        { status: 400 }
      );
    }

    const category = await withAuditLog(
      { action: 'create', resource: 'category' },
      () => prisma.category.create({
        data: {
          name,
          slug,
          description: description || '',
          color: color || '#6366f1',
          parentId: parentId || null
        }
      }),
      undefined,
      (result) => ({ id: result.id, name: result.name })
    );

    return NextResponse.json(category);
  } catch (error) {
    console.error('Create category failed:', error);
    return NextResponse.json(
      { error: '创建分类失败' },
      { status: 500 }
    );
  }
}
