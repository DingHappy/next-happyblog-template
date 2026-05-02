import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

function getKnowledgeBasePath(): string {
  return (
    process.env.EXPORT_KNOWLEDGE_PATH ||
    process.env.KNOWLEDGE_BASE_PATH ||
    path.join(process.cwd(), 'knowledge', 'docs')
  );
}

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 转换为安全的文件名
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function GET() {
  if (!await requireAuth()) {
    return unauthorizedResponse();
  }
  
  try {
    const posts = await prisma.post.findMany({
      include: {
        category: true,
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 检查文件是否已存在
    const postsWithStatus = await Promise.all(
      posts.map(async (post) => {
        const categorySlug = post.category?.name || 'uncategorized';
        const fileName = slugify(post.title) + '.md';
        const filePath = path.join(getKnowledgeBasePath(), categorySlug, fileName);

        try {
          await fs.access(filePath);
          return { ...post, fileExists: true };
        } catch {
          return { ...post, fileExists: false };
        }
      })
    );

    return NextResponse.json({ posts: postsWithStatus });
  } catch (error) {
    console.error('Get export list failed:', error);
    return NextResponse.json(
      { error: '获取导出列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!await requireAuth()) {
    return unauthorizedResponse();
  }
  
  try {
    const body = await request.json();
    const { postIds, overwrite = false } = body;

    if (!postIds || postIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要导出的文章' },
        { status: 400 }
      );
    }

    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        category: true,
        tags: true,
      },
    });

    const results = [];
    let exported = 0;
    let skipped = 0;

    for (const post of posts) {
      const categorySlug = post.category?.name || 'uncategorized';
      const fileName = slugify(post.title) + '.md';
      const dirPath = path.join(getKnowledgeBasePath(), categorySlug);
      const filePath = path.join(dirPath, fileName);

      try {
        // 检查文件是否存在
        try {
          await fs.access(filePath);
          if (!overwrite) {
            skipped++;
            results.push({ title: post.title, file: fileName, status: 'skipped', reason: '文件已存在' });
            continue;
          }
        } catch {}

        // 确保目录存在
        await ensureDir(dirPath);

        // 生成 Frontmatter
        const frontmatter = [
          '---',
          `title: "${post.title.replace(/"/g, '\\"')}"`,
          `date: ${new Date(post.createdAt).toISOString().split('T')[0]}`,
          post.category ? `category: "${post.category.name}"` : '',
          post.published !== undefined ? `published: ${post.published}` : '',
          post.tags?.length > 0 ? `tags: [${post.tags.map(t => `"${t.name}"`).join(', ')}]` : '',
          '---',
          '',
        ].filter(Boolean).join('\n');

        // 写入文件
        const content = frontmatter + post.content;
        await fs.writeFile(filePath, content, 'utf8');

        exported++;
        results.push({ title: post.title, file: fileName, status: 'exported' });
      } catch (error) {
        console.error(`Failed to export ${post.title}:`, error);
        results.push({
          title: post.title,
          file: fileName,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: posts.length,
        exported,
        skipped,
      },
      results,
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { error: '导出失败', details: String(error) },
      { status: 500 }
    );
  }
}
