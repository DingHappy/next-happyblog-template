import { slugify } from '@/lib/slug';

export interface PostValidationInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  tags?: unknown;
}

export interface PostValidationResult {
  errors: string[];
  warnings: string[];
  normalized: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    tags: string[];
  };
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateExcerpt(content: string, maxLength = 150): string {
  const plainText = stripMarkdown(content);
  if (!plainText) return '';
  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

export function normalizeTagNames(value: unknown): string[] {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const tagsBySlug = new Map<string, string>();
  for (const rawTag of rawTags) {
    const name = String(rawTag).trim();
    if (!name) continue;
    const slug = slugifyTag(name);
    if (!tagsBySlug.has(slug)) {
      tagsBySlug.set(slug, name);
    }
  }

  return Array.from(tagsBySlug.values()).slice(0, 12);
}

export function slugifyTag(name: string): string {
  return slugify(name) || name.toLowerCase().replace(/\s+/g, '-');
}

export function normalizePostSlug(title: string, requestedSlug?: string): string {
  return slugify(requestedSlug || title) || `post-${Date.now()}`;
}

export function validatePostInput(input: PostValidationInput): PostValidationResult {
  const title = String(input.title || '').trim();
  const content = String(input.content || '').trim();
  const slug = normalizePostSlug(title, String(input.slug || '').trim());
  const excerpt = String(input.excerpt || '').trim() || generateExcerpt(content);
  const tags = normalizeTagNames(input.tags);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!title) errors.push('文章标题不能为空');
  if (!content) errors.push('文章内容不能为空');
  if (!slug) errors.push('文章 slug 不能为空');
  if (slug.length > 96) errors.push('文章 slug 不能超过 96 个字符');
  if (!/^[\w\u4e00-\u9fa5-]+$/.test(slug)) errors.push('文章 slug 只能包含字母、数字、中文、下划线和短横线');

  if (title && title.length < 5) warnings.push('标题偏短，建议至少 5 个字');
  if (title.length > 70) warnings.push('标题偏长，建议控制在 70 个字以内');
  if (!excerpt) warnings.push('建议填写摘要，便于搜索和 SEO 展示');
  if (excerpt && excerpt.length < 50) warnings.push('摘要偏短，建议 50-160 字');
  if (excerpt.length > 180) warnings.push('摘要偏长，建议控制在 180 字以内');
  if (stripMarkdown(content).length < 300) warnings.push('正文偏短，建议至少 300 字');
  if (tags.length > 8) warnings.push('标签较多，建议控制在 8 个以内');

  return {
    errors,
    warnings,
    normalized: {
      title,
      slug,
      excerpt,
      content,
      tags,
    },
  };
}
