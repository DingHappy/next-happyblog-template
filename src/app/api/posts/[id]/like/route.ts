import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const post = await prisma.post.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error('like failed:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const post = await prisma.post.update({
      where: { id },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error('unlike failed:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
