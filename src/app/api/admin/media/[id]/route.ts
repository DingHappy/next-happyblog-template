import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';
import fs from 'fs/promises';
import path from 'path';

// 删除图片
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('media:manage');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    
    // 查找图片记录
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    // 删除文件
    const filePath = path.join(process.cwd(), 'public', media.url);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // 继续删除数据库记录
    }

    // 删除数据库记录
    await withAuditLog(
      { action: 'delete', resource: 'media', resourceId: id },
      () => prisma.media.delete({ where: { id } }),
      () => ({ filename: media.filename, url: media.url })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json(
      { error: '删除图片失败' },
      { status: 500 }
    );
  }
}
