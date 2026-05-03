'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from '@/components/MarkdownEditor';
import MediaPicker from '@/components/MediaPicker';
import PostQualityPanel from '@/components/PostQualityPanel';
import { useToast } from '@/components/FeedbackProvider';
import { slugify } from '@/lib/slug';
import { normalizeTagNames } from '@/lib/post-content';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  children: Category[];
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

export default function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [postId, setPostId] = useState<string>('');
  const [formData, setFormData] = useState({
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
  });

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

  // 加载分类列表
  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error);
  }, []);

  // 加载文章数据
  useEffect(() => {
    const loadPost = async () => {
      const { id } = await params;
      setPostId(id);
      try {
        const response = await fetch(`/api/admin/posts/${id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            title: data.title,
            slug: data.slug || '',
            excerpt: data.excerpt,
            content: data.content,
            categoryId: data.categoryId || '',
            tags: Array.isArray(data.tags) ? data.tags.map((tag: { name: string }) => tag.name).join(', ') : '',
            coverImage: data.coverImage || '',
            seoTitle: data.seoTitle || '',
            seoDescription: data.seoDescription || '',
            canonicalUrl: data.canonicalUrl || '',
            ogImage: data.ogImage || '',
            noIndex: data.noIndex ?? false,
            published: data.published,
            isPublic: data.isPublic ?? true,
            isPinned: data.isPinned ?? false,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : '',
          });

          const draftResponse = await fetch(`/api/admin/posts/${id}/autosave`);
          if (draftResponse.ok) {
            const draftData = await draftResponse.json();
            const draft = draftData.draft;
            if (draft) {
              setFormData(prev => ({
                ...prev,
                title: draft.title || prev.title,
                slug: draft.slug || '',
                excerpt: draft.excerpt || '',
                content: draft.content || '',
                categoryId: draft.categoryId || '',
                tags: draft.tags ? JSON.parse(draft.tags).join(', ') : '',
                coverImage: draft.coverImage || '',
                seoTitle: draft.seoTitle || '',
                seoDescription: draft.seoDescription || '',
                canonicalUrl: draft.canonicalUrl || '',
                ogImage: draft.ogImage || '',
                noIndex: draft.noIndex ?? false,
                published: draft.published,
                isPublic: draft.isPublic ?? true,
                isPinned: draft.isPinned ?? false,
                scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString().slice(0, 16) : '',
              }));
              setLastSaved(new Date(draft.updatedAt));
              toast('已恢复自动保存草稿', 'success');
            }
          }
        }
      } catch {
        toast('加载文章失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadPost();
  }, [params, toast]);

  // 自动保存草稿，不覆盖正式文章
  useEffect(() => {
    if (isLoading || isSaving || !postId || (!formData.title && !formData.content)) return;

    const timer = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const response = await fetch(`/api/admin/posts/${postId}/autosave`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Auto save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [isLoading, isSaving, formData, postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { id } = await params;
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast('文章已保存', 'success');
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

  const handleExport = async () => {
    if (!postId) return;
    
    try {
      const response = await fetch(`/api/admin/posts/${postId}/export`);
      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.slug || postId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('文章已导出', 'success');
    } catch {
      toast('导出失败，请重试', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
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
              <h1 className="text-xl font-bold text-gray-900">编辑文章</h1>
            </div>
             <div className="flex items-center gap-3">
               {isAutoSaving && (
                 <span className="text-xs text-gray-500 flex items-center gap-1">
                   <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                   自动保存中...
                 </span>
               )}
               {lastSaved && (
                 <span className="text-xs text-gray-500">
                   自动草稿: {lastSaved.toLocaleTimeString('zh-CN')}
                 </span>
               )}
                <Link
                  href={`/admin/posts/${postId}/versions`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  📜 版本历史
                </Link>
                <button
                  onClick={handleExport}
                  disabled={!postId}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  📤 导出 MD
                </button>
                <button
                  onClick={() => postId && window.open(`/admin/posts/${postId}/preview`, '_blank')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  🔗 独立预览
                </button>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入文章标题..."
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-lg font-medium"
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <MarkdownEditor
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="# 在这里写你的文章内容..."
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
                    <p className="mt-1.5 text-xs text-gray-400">修改后文章新链接会变化，旧 id 链接仍可访问</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">摘要</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="文章摘要"
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
                       已发布
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
