import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/posts/[id]/export - 导出文章为 Markdown
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        tags: true,
        category: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    const frontmatter = [
      '---',
      `title: "${post.title.replace(/"/g, '\\"')}"`,
      `slug: ${post.slug || ''}`,
      `date: ${post.createdAt.toISOString()}`,
      `category: ${post.category?.name || ''}`,
      `tags: [${post.tags.map(t => t.name).join(', ')}]`,
      `published: ${post.published}`,
      `public: ${post.isPublic}`,
      '---',
      '',
    ].join('\n');

    const markdownContent = frontmatter + post.content;

    const filename = `${post.slug || post.id}.md`;

    return new NextResponse(markdownContent, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export post error:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}