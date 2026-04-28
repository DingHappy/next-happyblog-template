import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const links = await prisma.friendLink.findMany({
      where: { isVisible: true },
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
