import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { slugify } from '@/lib/slug';

// POST /api/admin/posts/import - 从 Markdown 导入文章
export async function POST(request: Request) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请选择要导入的文件' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.md')) {
      return NextResponse.json(
        { error: '只支持 .md 格式的 Markdown 文件' },
        { status: 400 }
      );
    }

    const content = await file.text();

    // 解析 frontmatter
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);

    let title = file.name.replace(/\.md$/, '');
    let slug = slugify(title);
    let categoryName = '';
    let tags: string[] = [];
    let published = true;
    let isPublic = true;
    let bodyContent = content;

    if (match) {
      const frontmatterText = match[1];
      bodyContent = content.slice(match[0].length);

      // 解析 frontmatter 字段
      const titleMatch = frontmatterText.match(/title:\s*"([^"]+)"|title:\s*([^\n]+)/);
      if (titleMatch) {
        title = titleMatch[1] || titleMatch[2] || title;
      }

      const slugMatch = frontmatterText.match(/slug:\s*([^\n]+)/);
      if (slugMatch && slugMatch[1].trim()) {
        slug = slugMatch[1].trim();
      }

      const categoryMatch = frontmatterText.match(/category:\s*([^\n]+)/);
      if (categoryMatch) {
        categoryName = categoryMatch[1].trim();
      }

      const tagsMatch = frontmatterText.match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch && tagsMatch[1]) {
        tags = tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
      }

      const publishedMatch = frontmatterText.match(/published:\s*(true|false)/);
      if (publishedMatch) {
        published = publishedMatch[1] === 'true';
      }

      const publicMatch = frontmatterText.match(/public:\s*(true|false)/);
      if (publicMatch) {
        isPublic = publicMatch[1] === 'true';
      }
    }

    // 处理分类
    let categoryId = null;
    if (categoryName) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName },
      });
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            slug: slugify(categoryName),
            color: '#6366f1',
          },
        });
      }
      categoryId = category.id;
    }

    // 处理标签
    const tagConnectOrCreate = tags.map(name => ({
      where: { slug: slugify(name) },
      create: {
        name,
        slug: slugify(name),
      },
    }));

    // 提取摘要
    const excerpt = bodyContent
      .replace(/[#*`\[\]()]/g, '')
      .slice(0, 160)
      .trim() + (bodyContent.length > 160 ? '...' : '');

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title,
        slug: slug || slugify(title),
        content: bodyContent,
        excerpt,
        categoryId,
        published,
        isPublic,
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
      },
      include: {
        tags: true,
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Import post error:', error);
    return NextResponse.json(
      { error: '导入失败，请检查文件格式' },
      { status: 500 }
    );
  }
}