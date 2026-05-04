'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from '@/components/MarkdownEditor';
import MediaPicker from '@/components/MediaPicker';
import PostQualityPanel from '@/components/PostQualityPanel';
import { useToast } from '@/components/FeedbackProvider';
import { slugify } from '@/lib/slug';
import { generateExcerpt, normalizeTagNames } from '@/lib/post-content';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  children: Category[];
}

const NEW_POST_DRAFT_KEY = 'new-post-autosave-draft';

const emptyPostFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  categoryId: '',
  tags: '',
  coverImage: '',
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  ogImage: '',
  noIndex: false,
  published: true,
  isPublic: true,
  isPinned: false,
  scheduledAt: '',
};

type PostFormData = typeof emptyPostFormData;

function readNewPostDraft(): { formData: PostFormData; savedAt: Date | null } {
  if (typeof window === 'undefined') {
    return { formData: emptyPostFormData, savedAt: null };
  }

  const savedDraft = window.localStorage.getItem(NEW_POST_DRAFT_KEY);
  if (!savedDraft) {
    return { formData: emptyPostFormData, savedAt: null };
  }

  try {
    const parsed = JSON.parse(savedDraft);
    if (parsed?.formData && (parsed.formData.title || parsed.formData.content)) {
      return {
        formData: { ...emptyPostFormData, ...parsed.formData } as PostFormData,
        savedAt: parsed.savedAt ? new Date(parsed.savedAt) : null,
      };
    }
  } catch {
    window.localStorage.removeItem(NEW_POST_DRAFT_KEY);
  }

  return { formData: emptyPostFormData, savedAt: null };
}

function flattenCategories(categories: Category[], result: Category[] = []): Category[] {
  for (const cat of categories) {
    result.push(cat);
    if (cat.children && cat.children.length > 0) {
      flattenCategories(cat.children, result);
    }
  }
  return result;
}

export default function NewPost() {
  const router = useRouter();
  const toast = useToast();
  const [initialDraft] = useState(readNewPostDraft);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialDraft.savedAt);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<PostFormData>(initialDraft.formData);

  // 检查管理员权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        if (!response.ok) {
          router.push('/admin');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isSaving || (!formData.title && !formData.content)) return;

    const timer = window.setTimeout(() => {
      const savedAt = new Date();
      window.localStorage.setItem(NEW_POST_DRAFT_KEY, JSON.stringify({ formData, savedAt: savedAt.toISOString() }));
      setLastSaved(savedAt);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [formData, isSaving]);

  const updateContent = (content: string) => {
    setFormData(prev => {
      if (prev.excerpt) {
        return { ...prev, content };
      }

      return {
        ...prev,
        content,
        excerpt: generateExcerpt(content),
      };
    });
  };

  const updateTitle = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug ? prev.slug : slugify(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        window.localStorage.removeItem(NEW_POST_DRAFT_KEY);
        toast('文章已创建', 'success');
        router.push('/admin/posts');
      } else {
        const error = await response.json().catch(() => null);
        toast(error?.error || '保存失败，请重试', 'error');
      }
    } catch {
      toast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/posts/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast('导入成功', 'success');
        router.push(`/admin/posts/${data.post.id}/edit`);
      } else {
        const error = await response.json();
        toast(error.error || '导入失败，请重试', 'error');
      }
    } catch {
      toast('导入失败，请重试', 'error');
    }

    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto pl-14 pr-4 py-4 md:px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">新建文章</h1>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".md"
                onChange={handleImport}
                className="hidden"
                id="import-markdown"
              />
              <label
                htmlFor="import-markdown"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                📥 导入 MD
              </label>
              <button
                onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                {activeTab === 'edit' ? '👁 预览' : '✏️ 编辑'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !formData.title || !formData.content}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '💾 保存文章'}
              </button>
            </div>
          </div>
          {lastSaved && (
            <p className="mt-2 text-right text-xs text-gray-500">
              本地草稿已自动保存：{lastSaved.toLocaleTimeString('zh-CN')}
            </p>
          )}
        </div>
      </header>

      {/* 编辑区域 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'edit' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧编辑区 */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">文章标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="输入文章标题..."
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-lg font-medium"
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <MarkdownEditor
                  value={formData.content}
                  onChange={updateContent}
                  placeholder="# 在这里写你的文章内容...\n\n支持 Markdown 语法"
                />
              </div>
            </div>

            {/* 右侧设置区 */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4">文章设置</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">分类</label>
                     <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all"
                    >
                      <option value="">选择分类</option>
                      {flattenCategories(categories).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">URL Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                      onBlur={() => setFormData(prev => ({ ...prev, slug: prev.slug || slugify(prev.title) }))}
                      placeholder="my-first-post"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm font-mono"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">用于文章链接，留空会根据标题生成</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">摘要</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="文章摘要（自动生成，可手动修改）"
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">标签</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      onBlur={() => setFormData(prev => ({ ...prev, tags: normalizeTagNames(prev.tags).join(', ') }))}
                      placeholder="React, Next.js, 生活"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">多个标签用英文逗号分隔，重复标签会自动合并</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">封面图 URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.coverImage}
                        onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                        placeholder="https://... 或 /uploads/example.jpg"
                        className="min-w-0 flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                      />
                      <MediaPicker
                        onSelect={(url) => setFormData(prev => ({ ...prev, coverImage: url }))}
                      />
                    </div>
                    {formData.coverImage && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 h-32 relative">
                        <Image src={formData.coverImage} alt="封面预览" fill className="object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-700 mb-3">SEO 设置</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">SEO 标题</label>
                        <input
                          type="text"
                          value={formData.seoTitle}
                          onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                          placeholder={formData.title || '默认使用文章标题'}
                          maxLength={70}
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">SEO 描述</label>
                        <textarea
                          value={formData.seoDescription}
                          onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                          placeholder={formData.excerpt || '默认使用文章摘要'}
                          maxLength={200}
                          rows={3}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Canonical URL</label>
                        <input
                          type="text"
                          value={formData.canonicalUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                          placeholder="/posts/my-post 或 https://example.com/posts/my-post"
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Open Graph 图片</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.ogImage}
                            onChange={(e) => setFormData(prev => ({ ...prev, ogImage: e.target.value }))}
                            placeholder={formData.coverImage || '默认使用封面图'}
                            className="min-w-0 flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                          />
                          <MediaPicker onSelect={(url) => setFormData(prev => ({ ...prev, ogImage: url }))} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="noIndex"
                          checked={formData.noIndex}
                          onChange={(e) => setFormData(prev => ({ ...prev, noIndex: e.target.checked }))}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <label htmlFor="noIndex" className="text-sm font-medium text-gray-700">
                          不允许搜索引擎索引
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="published"
                      checked={formData.published}
                      onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <label htmlFor="published" className="text-sm font-medium text-gray-700">
                      立即发布
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                      公开可见
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPinned"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                      className="w-4 h-4 text-red-500 rounded"
                    />
                    <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
                      📌 置顶文章
                    </label>
                  </div>

                  {!formData.published && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">定时发布时间</label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-sm"
                      />
                      <p className="mt-1.5 text-xs text-gray-400">设置后将在指定时间自动发布</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 写作提示 */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-3">💡 写作提示</h4>
                <ul className="text-sm text-blue-700 space-y-1.5">
                  <li>• 标题建议 5-20 字</li>
                  <li>• 摘要建议 100-150 字</li>
                  <li>• 使用 H2/H3 标题分层</li>
                  <li>• 适当添加代码示例</li>
                  <li>• 记得添加封面图</li>
                </ul>
              </div>

              <PostQualityPanel
                title={formData.title}
                slug={formData.slug}
                excerpt={formData.seoDescription || formData.excerpt}
                content={formData.content}
                tags={formData.tags}
                onApplySlug={(slug) => setFormData(prev => ({ ...prev, slug }))}
                onApplyExcerpt={(excerpt) => setFormData(prev => ({ ...prev, excerpt }))}
                onNormalizeTags={(tags) => setFormData(prev => ({ ...prev, tags }))}
              />
            </div>
          </div>
        ) : (
          /* 预览模式 */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="max-w-3xl mx-auto">
              {(() => {
                const selectedCategory = flattenCategories(categories).find(c => c.id === formData.categoryId);
                if (selectedCategory) {
                  return (
                    <span 
                      className="inline-flex px-3 py-1 rounded-full text-xs font-bold mb-4 text-white"
                      style={{ backgroundColor: selectedCategory.color }}
                    >
                      {selectedCategory.name}
                    </span>
                  );
                }
                return null;
              })()}
              {formData.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {normalizeTagNames(formData.tags).map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {formData.title || '（未填写标题）'}
              </h1>
              {formData.coverImage && (
                <div className="relative w-full h-64 rounded-2xl mb-6 shadow-lg overflow-hidden">
                  <Image src={formData.coverImage} alt="封面" fill className="object-cover" />
                </div>
              )}
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {formData.content || '（暂无内容，请在编辑模式下输入）'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
