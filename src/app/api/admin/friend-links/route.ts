import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const links = await prisma.friendLink.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Get friend links error:', error);
    return NextResponse.json(
      { error: '获取友情链接失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, url, description, avatar, isVisible = true, order = 0 } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: '名称和 URL 不能为空' },
        { status: 400 }
      );
    }

    const link = await prisma.friendLink.create({
      data: {
        name,
        url,
        description,
        avatar,
        isVisible,
        order: parseInt(order) || 0,
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error('Create friend link error:', error);
    return NextResponse.json(
      { error: '创建友情链接失败' },
      { status: 500 }
    );
  }
}
