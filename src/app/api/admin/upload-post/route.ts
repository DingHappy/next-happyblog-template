import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import { verifySyncToken, syncUnauthorizedResponse } from '@/lib/sync-auth';

export const runtime = 'nodejs';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'synced');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);
const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB hard cap per request

interface IncomingImage {
  ref: string;       // exact reference string as it appears in markdown (e.g. "../assets/foo.png")
  filename: string;  // basename used on disk
  base64: string;
}

interface IncomingPost {
  sourcePath: string;
  frontmatter: Record<string, unknown>;
  content: string;
  images?: IncomingImage[];
}

interface UploadBody {
  posts: IncomingPost[];
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
}

function sourcePathToBucket(sourcePath: string): string {
  return sourcePath
    .replace(/\.md$/i, '')
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9-_一-龥]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeFilename(name: string): string {
  return path.basename(name).replace(/[^\w.\-一-龥]/g, '_');
}

function writeImages(bucket: string, images: IncomingImage[]): Map<string, string> {
  const refToUrl = new Map<string, string>();
  if (images.length === 0) return refToUrl;

  const targetDir = path.join(UPLOADS_DIR, bucket);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const img of images) {
    const ext = path.extname(img.filename).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const safeName = safeFilename(img.filename);
    const buf = Buffer.from(img.base64, 'base64');
    fs.writeFileSync(path.join(targetDir, safeName), buf);
    refToUrl.set(img.ref, `/uploads/synced/${bucket}/${encodeURIComponent(safeName)}`);
  }
  return refToUrl;
}

function rewriteImageRefs(content: string, refToUrl: Map<string, string>): string {
  if (refToUrl.size === 0) return content;
  let next = content;
  // markdown ![alt](path "title")
  next = next.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g,
    (full, alt, p, title) => {
      const url = refToUrl.get(p);
      return url ? `![${alt}](${url}${title ?? ''})` : full;
    }
  );
  // <img src="...">
  next = next.replace(
    /<img\b([^>]*?)src=["']([^"']+)["']/gi,
    (full, pre, p) => {
      const url = refToUrl.get(p);
      return url ? `<img${pre}src="${url}"` : full;
    }
  );
  return next;
}

async function getOrCreateCategory(name: string) {
  let category = await prisma.category.findFirst({ where: { name } });
  if (category) return category;

  const baseSlug = name.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
  category = await prisma.category.findFirst({ where: { slug: baseSlug } });
  if (category) return category;

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    try {
      return await prisma.category.create({
        data: { name, slug, color: '#6366f1' },
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

interface UpsertResult {
  sourcePath: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  postId?: string;
  slug?: string;
  error?: string;
}

async function upsertPost(input: IncomingPost): Promise<UpsertResult> {
  const fm = input.frontmatter || {};
  const sourcePath = input.sourcePath;
  const bucket = sourcePathToBucket(sourcePath);

  const refToUrl = writeImages(bucket, input.images || []);
  const content = rewriteImageRefs(input.content, refToUrl);

  const titleFromHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title =
    asString(fm.title) ||
    titleFromHeading ||
    path.basename(sourcePath, '.md');

  let excerpt = asString(fm.excerpt) || asString(fm.description) || asString(fm.summary);
  if (!excerpt) {
    const plain = content
      .replace(/^#.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    excerpt = plain.slice(0, 150) + (plain.length > 150 ? '...' : '');
  }

  const dirName = path.dirname(sourcePath);
  const categoryFromPath = dirName === '.' ? 'uncategorized' : dirName.split(path.sep)[0];
  const category = asString(fm.category) || categoryFromPath || 'uncategorized';

  const tags = asStringArray(fm.tags) || asStringArray(fm.tag);
  const published = asBoolean(fm.published) ?? true;
  let isPublic =
    asBoolean(fm.isPublic) ??
    asBoolean(fm.public) ??
    asBoolean(fm.visible) ??
    true;
  const privateFm = asBoolean(fm.private);
  if (privateFm !== undefined) isPublic = !privateFm;
  if (tags?.some((t) => t.toLowerCase() === 'public')) isPublic = true;
  if (tags?.some((t) => t.toLowerCase() === 'private')) isPublic = false;

  let coverImage = asString(fm.coverImage) || asString(fm.image);
  if (coverImage && !/^(https?:|data:|\/)/i.test(coverImage)) {
    coverImage = refToUrl.get(coverImage) || coverImage;
  }

  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 32);

  const existing = await prisma.post.findUnique({ where: { sourcePath } });

  if (existing) {
    if (
      existing.sourceHash === hash &&
      existing.published === published &&
      existing.isPublic === isPublic
    ) {
      return { sourcePath, status: 'skipped', postId: existing.id, slug: existing.slug };
    }

    const cat = await getOrCreateCategory(category);
    const tagRows = await getOrCreateTags(tags);
    const slug = await buildUniquePostSlug(title, existing.id);

    await prisma.post.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        content,
        excerpt,
        sourceHash: hash,
        sourcePath,
        published,
        isPublic,
        coverImage: coverImage || null,
        categoryId: cat.id,
        tags: { set: tagRows.map((t) => ({ id: t.id })) },
      },
    });
    // Drop any stale autosaved draft so the editor doesn't "restore" it
    // over the content we just pushed.
    await prisma.postDraft.deleteMany({ where: { postId: existing.id } });
    return { sourcePath, status: 'updated', postId: existing.id, slug };
  }

  const cat = await getOrCreateCategory(category);
  const tagRows = await getOrCreateTags(tags);
  const slug = await buildUniquePostSlug(title);

  const created = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      sourceHash: hash,
      sourcePath,
      categoryId: cat.id,
      published,
      isPublic,
      coverImage: coverImage || null,
      tags:
        tagRows.length > 0
          ? { connect: tagRows.map((t) => ({ id: t.id })) }
          : undefined,
    },
  });
  return { sourcePath, status: 'created', postId: created.id, slug };
}

export async function POST(request: Request) {
  if (!verifySyncToken(request)) return syncUnauthorizedResponse();

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.posts) || body.posts.length === 0) {
    return NextResponse.json({ error: 'posts array required' }, { status: 400 });
  }

  const results: UpsertResult[] = [];
  let created = 0, updated = 0, skipped = 0, errored = 0;

  for (const post of body.posts) {
    if (!post?.sourcePath || typeof post.content !== 'string') {
      results.push({
        sourcePath: post?.sourcePath || '(unknown)',
        status: 'error',
        error: 'sourcePath and content required',
      });
      errored++;
      continue;
    }
    try {
      const r = await upsertPost(post);
      results.push(r);
      if (r.status === 'created') created++;
      else if (r.status === 'updated') updated++;
      else if (r.status === 'skipped') skipped++;
    } catch (err) {
      console.error(`[upload-post] ${post.sourcePath} failed:`, err);
      results.push({ sourcePath: post.sourcePath, status: 'error', error: String(err) });
      errored++;
    }
  }

  return NextResponse.json({
    success: errored === 0,
    summary: { total: body.posts.length, created, updated, skipped, errored },
    results,
  });
}
