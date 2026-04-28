import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// DELETE /api/admin/posts/[id]/versions/[versionId] - 删除版本
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    await requireAuth();
    
    const { versionId } = await params;

    // 检查版本是否存在
    const version = await prisma.postVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      );
    }

    // 删除版本
    await prisma.postVersion.delete({
      where: { id: versionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete version error:', error);
    return NextResponse.json(
      { error: '删除版本失败' },
      { status: 500 }
    );
  }
}