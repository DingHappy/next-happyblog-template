'use client';

import SEOPanel from '@/components/SEOPanel';
import { generateExcerpt, normalizePostSlug, normalizeTagNames, validatePostInput } from '@/lib/post-content';

interface PostQualityPanelProps {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string;
  onApplyExcerpt?: (excerpt: string) => void;
  onApplySlug?: (slug: string) => void;
  onNormalizeTags?: (tags: string) => void;
}

export default function PostQualityPanel({
  title,
  slug,
  excerpt,
  content,
  tags,
  onApplyExcerpt,
  onApplySlug,
  onNormalizeTags,
}: PostQualityPanelProps) {
  const validation = validatePostInput({ title, slug, excerpt, content, tags });
  const generatedSlug = normalizePostSlug(title, slug);
  const generatedExcerpt = generateExcerpt(content);
  const normalizedTags = normalizeTagNames(tags);
  const normalizedTagText = normalizedTags.join(', ');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-sm font-bold uppercase tracking-wider text-transparent">
            发布检查
          </h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              validation.errors.length > 0
                ? 'bg-red-100 text-red-700'
                : validation.warnings.length > 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {validation.errors.length > 0 ? '需修复' : validation.warnings.length > 0 ? '可优化' : '良好'}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          {validation.errors.map((error) => (
            <p key={error} className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
              {error}
            </p>
          ))}
          {validation.warnings.map((warning) => (
            <p key={warning} className="rounded-xl bg-yellow-50 px-3 py-2 text-yellow-700">
              {warning}
            </p>
          ))}
          {validation.errors.length === 0 && validation.warnings.length === 0 && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-green-700">
              基础字段、摘要、标签和 SEO 长度看起来都不错。
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2">
          {onApplySlug && generatedSlug && generatedSlug !== slug && (
            <button
              type="button"
              onClick={() => onApplySlug(generatedSlug)}
              className="rounded-xl bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              使用规范 slug: <span className="font-mono">{generatedSlug}</span>
            </button>
          )}
          {onApplyExcerpt && generatedExcerpt && generatedExcerpt !== excerpt && (
            <button
              type="button"
              onClick={() => onApplyExcerpt(generatedExcerpt)}
              className="rounded-xl bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              使用自动摘要
            </button>
          )}
          {onNormalizeTags && normalizedTagText && normalizedTagText !== tags && (
            <button
              type="button"
              onClick={() => onNormalizeTags(normalizedTagText)}
              className="rounded-xl bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              合并重复标签: {normalizedTagText}
            </button>
          )}
        </div>
      </div>

      <SEOPanel title={title} description={excerpt} content={content} />
    </div>
  );
}
