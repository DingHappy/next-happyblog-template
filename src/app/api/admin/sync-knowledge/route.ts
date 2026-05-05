import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { slugify } from '@/lib/slug';

const KNOWLEDGE_BASE_PATH =
  process.env.KNOWLEDGE_BASE_PATH ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'knowledge', 'docs');

const UPLOADS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'synced');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);

interface MarkdownFile {
  filePath: string;
  sourcePath: string; // 相对 KNOWLEDGE_BASE_PATH
  title: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  isPublic: boolean;
  status: string;
  hash: string;
  coverImage?: string;
  tags?: string[];
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === '1') return true;
  if (v === '0') return false;
  return undefined;
}

function getAllMarkdownFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function sourcePathToBucket(sourcePath: string): string {
  // 把 "ai/notes/foo.md" 转成 "ai-notes-foo" 作为图片目录名
  return sourcePath
    .replace(/\.md$/i, '')
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9-_一-龥]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// 扫描内容里的相对路径图片，复制到 public/uploads/synced/<bucket>/，并改写引用
function relocateImages(
  content: string,
  mdFilePath: string,
  bucket: string
): { content: string; copied: string[] } {
  const mdDir = path.dirname(mdFilePath);
  const copied: string[] = [];
  const seen = new Map<string, string>(); // relativePath → publicUrl

  function processPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (/^(https?:|data:|\/)/i.test(rawPath)) return rawPath;
    if (rawPath.startsWith('#')) return rawPath;

    const cached = seen.get(rawPath);
    if (cached) return cached;

    const resolved = path.resolve(mdDir, rawPath);
    const ext = path.extname(resolved).toLowerCase();
    if (!IMAGE_EXT.has(ext)) return rawPath;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return rawPath;

    const targetDir = path.join(UPLOADS_DIR, bucket);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetName = path.basename(resolved);
    const targetPath = path.join(targetDir, targetName);
    try {
      fs.copyFileSync(resolved, targetPath);
      copied.push(targetName);
    } catch (err) {
      console.warn(`[sync] copy image failed ${resolved}:`, err);
      return rawPath;
    }

    const url = `/uploads/synced/${bucket}/${encodeURIComponent(targetName)}`;
    seen.set(rawPath, url);
    return url;
  }

  // markdown 图片：![alt](path "title")
  let next = content.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g,
    (_m, alt, p, title) => `![${alt}](${processPath(p)}${title ?? ''})`
  );
  // HTML <img src="...">
  next = next.replace(
    /<img\b([^>]*?)src=["']([^"']+)["']/gi,
    (_m, pre, p) => `<img${pre}src="${processPath(p)}"`
  );

  return { content: next, copied };
}

function parseMarkdown(filePath: string): MarkdownFile {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  let body = parsed.content;

  const sourcePath = path.relative(KNOWLEDGE_BASE_PATH, filePath);

  // 标题：frontmatter > 第一个 # > 文件名
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title =
    asString(fm.title) ||
    (titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md'));

  // 复制相对路径图片到 public/uploads/synced 并重写 markdown
  const bucket = sourcePathToBucket(sourcePath);
  const relocated = relocateImages(body, filePath, bucket);
  body = relocated.content;

  // 摘要：frontmatter > 内容前 150 字符
  let excerpt =
    asString(fm.excerpt) ||
    asString(fm.description) ||
    asString(fm.summary);
  if (!excerpt) {
    const plain = body
      .replace(/^#.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    excerpt = plain.slice(0, 150) + (plain.length > 150 ? '...' : '');
  }

  // 分类：frontmatter > 路径首段
  const dirName = path.dirname(sourcePath);
  const categoryFromPath = dirName === '.' ? 'uncategorized' : dirName.split(path.sep)[0];
  const category = asString(fm.category) || categoryFromPath || 'uncategorized';

  const tags = asStringArray(fm.tags) || asStringArray(fm.tag);

  // 发布状态和公开可见是两个不同字段：
  // published 控制是否发布；isPublic 控制普通访客是否可见。
  const published = asBoolean(fm.published) ?? true;
  const status = published ? 'published' : 'draft';
  let isPublic =
    asBoolean(fm.isPublic) ??
    asBoolean(fm.public) ??
    asBoolean(fm.visible) ??
    true;
  const privateFm = asBoolean(fm.private);
  if (privateFm !== undefined) {
    isPublic = !privateFm;
  }
  if (tags?.some((tag) => tag.toLowerCase() === 'public')) {
    isPublic = true;
  }
  if (tags?.some((tag) => tag.toLowerCase() === 'private')) {
    isPublic = false;
  }

  // SHA256 截断（取前 32 hex 位即 128 bit，足够防碰撞）
  const hash = crypto
    .createHash('sha256')
    .update(body)
    .digest('hex')
    .slice(0, 32);

  let coverImage = asString(fm.coverImage) || asString(fm.image);
  // 封面图也可能是相对路径，复用同一套替换
  if (coverImage && !/^(https?:|data:|\/)/i.test(coverImage)) {
    const r = relocateImages(`![](${coverImage})`, filePath, bucket);
    const m = r.content.match(/!\[\]\(([^)]+)\)/);
    if (m) coverImage = m[1];
  }

  return {
    filePath,
    sourcePath,
    title,
    excerpt,
    content: body,
    category,
    published,
    isPublic,
    status,
    hash,
    coverImage,
    tags,
  };
}

async function getOrCreateCategory(categoryName: string) {
  let category = await prisma.category.findFirst({ where: { name: categoryName } });
  if (category) return category;

  const baseSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
  category = await prisma.category.findFirst({ where: { slug: baseSlug } });
  if (category) return category;

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    try {
      return await prisma.category.create({
        data: { name: categoryName, slug, color: '#6366f1' },
      });
    } catch (error) {
      const e = error as { code?: string; meta?: { target?: unknown } };
      const target = e.meta?.target;
      const isSlugConflict =
        e.code === 'P2002' &&
        (Array.isArray(target) ? target.includes('slug') : target === 'slug');
      if (isSlugConflict) {
        slug = `${baseSlug}-${counter++}`;
      } else {
        const existing = await prisma.category.findFirst({
          where: { slug: { startsWith: baseSlug } },
        });
        if (existing) return existing;
        throw error;
      }
    }
  }
}

async function getOrCreateTags(tagNames: string[] | undefined) {
  if (!tagNames || tagNames.length === 0) return [];
  const tags = [];
  for (const name of tagNames) {
    if (!name || typeof name !== 'string') continue;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    let tag = await prisma.tag.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name, slug } });
    }
    tags.push(tag);
  }
  return tags;
}

async function buildUniquePostSlug(title: string, postId?: string) {
  const base = slugify(title) || `post-${Date.now()}`;
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === postId) return slug;
    slug = `${base}-${counter++}`;
  }
}

const SKIP_FILES = new Set(['index.md', 'readme.md', '_index.md', 'README.md']);

export async function POST(request: Request) {
  const auth = await requirePermission('knowledge:sync');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const { categoryFilter, prune = false } = body;

    let mdFiles = getAllMarkdownFiles(KNOWLEDGE_BASE_PATH);
    mdFiles = mdFiles.filter((f) => !SKIP_FILES.has(path.basename(f)));

    if (categoryFilter && categoryFilter.length > 0) {
      mdFiles = mdFiles.filter((file) => {
        const rel = path.relative(KNOWLEDGE_BASE_PATH, file);
        const dir = path.dirname(rel);
        const cat = dir === '.' ? 'uncategorized' : dir.split(path.sep)[0];
        return categoryFilter.includes(cat);
      });
    }

    const results: Array<Record<string, unknown>> = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let pruned = 0;
    const seenSourcePaths = new Set<string>();

    for (const filePath of mdFiles) {
      try {
        const parsed = parseMarkdown(filePath);
        seenSourcePaths.add(parsed.sourcePath);

        // 优先按 sourcePath 匹配；老数据没有 sourcePath，回落到 sourceHash
        let existing = await prisma.post.findUnique({
          where: { sourcePath: parsed.sourcePath },
        });
        if (!existing && parsed.hash) {
          existing = await prisma.post.findFirst({
            where: { sourceHash: parsed.hash, sourcePath: null },
          });
        }

        if (existing) {
          if (
            existing.sourceHash === parsed.hash &&
            existing.sourcePath === parsed.sourcePath &&
            existing.published === parsed.published &&
            existing.status === parsed.status &&
            existing.isPublic === parsed.isPublic
          ) {
            skipped++;
            results.push({ file: parsed.sourcePath, status: 'skipped' });
            continue;
          }

          const tags = await getOrCreateTags(parsed.tags);
          const category = await getOrCreateCategory(parsed.category);
          const slug = await buildUniquePostSlug(parsed.title, existing.id);

          await prisma.post.update({
            where: { id: existing.id },
            data: {
              title: parsed.title,
              slug,
              content: parsed.content,
              excerpt: parsed.excerpt,
              sourceHash: parsed.hash,
              sourcePath: parsed.sourcePath,
              published: parsed.published,
              status: parsed.status,
              isPublic: parsed.isPublic,
              coverImage: parsed.coverImage || null,
              categoryId: category.id,
              // set 而非 connect：能去掉源文件里被移除的 tag
              tags: { set: tags.map((t) => ({ id: t.id })) },
            },
          });
          updated++;
          results.push({ file: parsed.sourcePath, status: 'updated' });
        } else {
          const category = await getOrCreateCategory(parsed.category);
          const tags = await getOrCreateTags(parsed.tags);
          const slug = await buildUniquePostSlug(parsed.title);

          await prisma.post.create({
            data: {
              title: parsed.title,
              slug,
              content: parsed.content,
              excerpt: parsed.excerpt,
              sourceHash: parsed.hash,
              sourcePath: parsed.sourcePath,
              categoryId: category.id,
              published: parsed.published,
              status: parsed.status,
              isPublic: parsed.isPublic,
              coverImage: parsed.coverImage || null,
              tags:
                tags.length > 0
                  ? { connect: tags.map((t) => ({ id: t.id })) }
                  : undefined,
            },
          });
          created++;
          results.push({ file: parsed.sourcePath, status: 'created' });
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        results.push({
          file: path.relative(KNOWLEDGE_BASE_PATH, filePath),
          status: 'error',
          error: String(error),
        });
      }
    }

    // 修剪：源文件已不存在的 post 视为孤儿
    if (prune) {
      const orphans = await prisma.post.findMany({
        where: { sourcePath: { not: null } },
        select: { id: true, sourcePath: true, title: true },
      });
      for (const o of orphans) {
        if (o.sourcePath && !seenSourcePaths.has(o.sourcePath)) {
          await prisma.post.delete({ where: { id: o.id } });
          pruned++;
          results.push({ file: o.sourcePath, status: 'pruned', title: o.title });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: mdFiles.length,
        created,
        updated,
        skipped,
        pruned,
      },
      results,
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: '同步失败', details: String(error) },
      { status: 500 }
    );
  }
}
