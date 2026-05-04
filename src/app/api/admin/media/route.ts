import { NextResponse } from 'next/server';
import sharp from 'sharp';
import GithubSlugger from 'github-slugger';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { withAuditLog } from '@/lib/audit';
import { getStorage } from '@/lib/storage';
import { randomUUID } from 'crypto';
import path from 'path';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 2000;
const WEBP_QUALITY = 82;

export async function GET() {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(media);
  } catch (error) {
    console.error('Get media error:', error);
    return NextResponse.json({ error: '获取图片失败' }, { status: 500 });
  }
}

function buildKey(originalName: string): string {
  const slugger = new GithubSlugger();
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const safeName = slugger.slug(baseName) || 'image';
  const uuid = randomUUID().slice(0, 8);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `images/${yyyy}/${mm}/${safeName}-${uuid}.webp`;
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const files = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    const storage = getStorage();
    const uploadedFiles = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `文件 ${file.name} 不是图片` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过 10MB 限制` },
          { status: 400 }
        );
      }

      const inputBuffer = Buffer.from(await file.arrayBuffer());

      // sharp() 会解析失败抛错(等于 magic bytes 校验);
      // .rotate() 读 EXIF Orientation 自动摆正;
      // .toFormat('webp') 默认丢弃 metadata,顺手剥掉 EXIF/GPS。
      let processed: Buffer;
      try {
        const image = sharp(inputBuffer, { failOn: 'error' }).rotate();
        const metadata = await image.metadata();
        const pipeline = image.clone();
        if (metadata.width && metadata.width > MAX_WIDTH) {
          pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
        }
        processed = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      } catch (err) {
        console.error('Image processing failed:', err);
        return NextResponse.json(
          { error: `文件 ${file.name} 不是有效的图片或已损坏` },
          { status: 400 }
        );
      }

      const key = buildKey(file.name);
      const { url } = await storage.put(key, processed, 'image/webp');

      const media = await withAuditLog(
        { action: 'create', resource: 'media' },
        () => prisma.media.create({
          data: {
            filename: file.name,
            url,
            size: processed.length,
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
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
