import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// 获取所有图片
export async function GET() {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const media = await prisma.media.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error('Get media error:', error);
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    );
  }
}

// 上传图片
export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    await ensureUploadDir();

    const formData = await request.formData();
    const files = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `文件 ${file.name} 不是图片` },
          { status: 400 }
        );
      }

      // 验证文件大小 (最大 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过 10MB 限制` },
          { status: 400 }
        );
      }

      // 生成文件名
      const ext = path.extname(file.name);
      const baseName = path.basename(file.name, ext);
      const uuid = randomUUID().slice(0, 8);
      const filename = `${baseName}-${uuid}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // 保存文件
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      // 保存到数据库
      const media = await withAuditLog(
        { action: 'create', resource: 'media' },
        () => prisma.media.create({
          data: {
            filename: file.name,
            url: `/uploads/${filename}`,
            size: file.size,
          },
        }),
        undefined,
        (result) => ({ id: result.id, filename: result.filename })
      );

      uploadedFiles.push(media);
    }

    return NextResponse.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Upload media error:', error);
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    );
  }
}
