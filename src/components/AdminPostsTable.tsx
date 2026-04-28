'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useConfirm, useToast } from '@/components/FeedbackProvider';

export interface AdminPostRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  isPublic: boolean;
  isPinned: boolean;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  tags: {
    id: string;
    name: string;
    slug: string;
  }[];
  commentsCount: number;
}

export interface AdminPostCategory {
  id: string;
  name: string;
  color: string;
}

export interface AdminPostTag {
  id: string;
  name: string;
  slug: string;
}

export interface AdminPostFilters {
  query: string;
  status: StatusFilter;
  categoryId: string;
  tagId: string;
  sort: SortOption;
  pageSize: number;
  page: number;
}

export interface AdminPostsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

type BatchAction =
  | 'publish'
  | 'unpublish'
  | 'public'
  | 'private'
  | 'pin'
  | 'unpin'
  | 'delete'
  | 'move-category'
  | 'clear-category'
  | 'set-tags'
  | 'add-tags'
  | 'remove-tags';
type StatusFilter = 'all' | 'published' | 'draft' | 'scheduled' | 'public' | 'private' | 'pinned';
type SortOption =
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'updatedAt-desc'
  | 'updatedAt-asc'
  | 'viewCount-desc'
  | 'viewCount-asc'
  | 'commentsCount-desc'
  | 'commentsCount-asc'
  | 'title-asc'
  | 'title-desc';

interface BatchRequestBody {
  action: BatchAction;
  ids: string[];
  categoryId?: string;
  tags?: string;
}

function statusLabel(post: AdminPostRow) {
  if (post.scheduledAt && !post.published) {
    return `定时发布 (${new Date(post.scheduledAt).toLocaleDateString('zh-CN')})`;
  }
  return post.published ? '已发布' : '草稿';
}

function statusClass(post: AdminPostRow) {
  if (post.scheduledAt && !post.published) {
    return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
  }
  return post.published
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
}

export default function AdminPostsTable({
  posts,
  categories,
  tags,
  filters,
  pagination,
  totalPosts,
}: {
  posts: AdminPostRow[];
  categories: AdminPostCategory[];
  tags: AdminPostTag[];
  filters: AdminPostFilters;
  pagination: AdminPostsPagination;
  totalPosts: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveCategoryId, setMoveCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [queryInput, setQueryInput] = useState(filters.query);
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedIds.size;
  const allVisibleSelected = posts.length > 0 && posts.every((post) => selectedIds.has(post.id));
  const firstItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      params.delete('page');
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
    setSelectedIds(new Set());
  };

  const submitSearch = () => {
    updateUrl({ q: queryInput.trim() || null });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        posts.forEach((post) => next.delete(post.id));
      } else {
        posts.forEach((post) => next.add(post.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBatchAction = async (action: BatchAction) => {
    if (selectedIds.size === 0) {
      toast('请先选择文章', 'info');
      return;
    }

    if (action === 'delete') {
      const ok = await confirm({
        message: `确定要删除选中的 ${selectedIds.size} 篇文章吗？此操作不可恢复。`,
      });
      if (!ok) return;
    }

    const body: BatchRequestBody = {
      action,
      ids: Array.from(selectedIds),
    };

    if (action === 'move-category') {
      if (!moveCategoryId) {
        toast('请先选择目标分类', 'error');
        return;
      }
      body.categoryId = moveCategoryId;
    }

    if (action === 'set-tags' || action === 'add-tags' || action === 'remove-tags') {
      if (!tagInput.trim()) {
        toast('请输入标签，多个标签用逗号分隔', 'error');
        return;
      }
      body.tags = tagInput;
    }

    const response = await fetch('/api/admin/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast(data.error || '批量操作失败', 'error');
      return;
    }

    const data = await response.json();
    toast(data.message || '批量操作成功', 'success');
    setSelectedIds(new Set());
    setMoveCategoryId('');
    setTagInput('');
    startTransition(() => {
      router.refresh();
    });
  };

  const deleteOne = async (id: string) => {
    const ok = await confirm({
      message: '确定要删除这篇文章吗？此操作不可恢复。',
    });
    if (!ok) return;

    const response = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast('删除文章失败', 'error');
      return;
    }
    toast('文章已删除', 'success');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">文章列表</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  共 {totalPosts} 篇文章，当前条件匹配 {pagination.totalItems} 篇，显示 {firstItem}-{lastItem}
                </p>
              </div>
              <Link
                href="/admin/posts/new"
                className="inline-flex w-fit items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                新建文章
              </Link>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex min-w-0 xl:w-[360px] xl:shrink-0">
                  <input
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitSearch();
                    }}
                    placeholder="搜索标题、slug、摘要、分类"
                    className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-gray-200 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={submitSearch}
                    disabled={isPending}
                    className="rounded-r-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    搜索
                  </button>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
                  <select
                    value={filters.status}
                    onChange={(e) => updateUrl({ status: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">全部状态</option>
                    <option value="published">已发布</option>
                    <option value="draft">草稿</option>
                    <option value="scheduled">定时发布</option>
                    <option value="public">公开</option>
                    <option value="private">不公开</option>
                    <option value="pinned">置顶</option>
                  </select>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => updateUrl({ categoryId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">全部分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.tagId}
                    onChange={(e) => updateUrl({ tagId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">全部标签</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateUrl({ sort: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="createdAt-desc">最新发布</option>
                    <option value="createdAt-asc">最早发布</option>
                    <option value="updatedAt-desc">最近更新</option>
                    <option value="updatedAt-asc">最早更新</option>
                    <option value="viewCount-desc">阅读量最高</option>
                    <option value="viewCount-asc">阅读量最低</option>
                    <option value="commentsCount-desc">评论最多</option>
                    <option value="commentsCount-asc">评论最少</option>
                    <option value="title-asc">标题 A-Z</option>
                    <option value="title-desc">标题 Z-A</option>
                  </select>
                  <select
                    value={String(filters.pageSize)}
                    onChange={(e) => updateUrl({ pageSize: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="20">20 / 页</option>
                    <option value="50">50 / 页</option>
                    <option value="100">100 / 页</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-slate-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">已选择 {selectedCount} 篇文章</span>
              <button onClick={() => runBatchAction('publish')} disabled={isPending} className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">批量发布</button>
              <button onClick={() => runBatchAction('unpublish')} disabled={isPending} className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50">转为草稿</button>
              <button onClick={() => runBatchAction('public')} disabled={isPending} className="rounded-lg bg-purple-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50">设为公开</button>
              <button onClick={() => runBatchAction('private')} disabled={isPending} className="rounded-lg bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">设为不公开</button>
              <button onClick={() => runBatchAction('pin')} disabled={isPending} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">置顶</button>
              <button onClick={() => runBatchAction('unpin')} disabled={isPending} className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">取消置顶</button>
              <div className="flex items-center gap-2">
                <select
                  value={moveCategoryId}
                  onChange={(e) => setMoveCategoryId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button onClick={() => runBatchAction('move-category')} disabled={isPending || !moveCategoryId} className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">移动分类</button>
                <button onClick={() => runBatchAction('clear-category')} disabled={isPending} className="rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50">清空分类</button>
              </div>
              <div className="flex min-w-full flex-wrap items-center gap-2 lg:min-w-0">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="标签，逗号分隔"
                  className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <button onClick={() => runBatchAction('set-tags')} disabled={isPending || !tagInput.trim()} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50">重设标签</button>
                <button onClick={() => runBatchAction('add-tags')} disabled={isPending || !tagInput.trim()} className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50">追加标签</button>
                <button onClick={() => runBatchAction('remove-tags')} disabled={isPending || !tagInput.trim()} className="rounded-lg bg-pink-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50">移除标签</button>
              </div>
              <button onClick={() => runBatchAction('delete')} disabled={isPending} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">批量删除</button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50 transition-colors dark:border-slate-600 dark:bg-slate-700/50">
              <tr>
                <th className="w-12 px-4 py-4 text-left">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" aria-label="选择当前页全部文章" />
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">标题</th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">分类</th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">状态</th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">评论</th>
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">创建时间</th>
                <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 transition-colors dark:divide-slate-700">
              {posts.map((post) => (
                <tr key={post.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30 ${selectedIds.has(post.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.has(post.id)} onChange={() => toggleSelect(post.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" aria-label={`选择文章 ${post.title}`} />
                  </td>
                  <td className="min-w-72 px-4 py-4">
                    <Link href={`/posts/${post.slug || post.id}`} target="_blank" className="font-semibold text-gray-900 transition-colors hover:text-purple-600 dark:text-white dark:hover:text-purple-400">
                      {post.title}
                    </Link>
                    <p className="mt-1 truncate font-mono text-xs text-gray-400">/{post.slug || post.id}</p>
                    {post.tags.length > 0 && (
                      <div className="mt-2 flex max-w-md flex-wrap gap-1.5">
                        {post.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {post.tags.length > 5 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-slate-700 dark:text-gray-300">
                            +{post.tags.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: post.category?.color || '#6366f1' }}>
                      {post.category?.name || '未分类'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(post)}`}>{statusLabel(post)}</span>
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${post.isPublic ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {post.isPublic ? '公开' : '不公开'}
                      </span>
                      {post.isPinned && <span className="inline-flex w-fit rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2.5 py-1 text-xs font-medium text-white">置顶</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{post.commentsCount}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(post.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <Link href={`/admin/posts/${post.id}/versions`} className="mr-4 text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">版本</Link>
                    <Link href={`/admin/posts/${post.id}/edit`} className="mr-4 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">编辑</Link>
                    <button onClick={() => deleteOne(post.id)} className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posts.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-4 text-5xl">📝</div>
              <p className="mb-4 text-gray-500 dark:text-gray-400">{totalPosts === 0 ? '还没有文章' : '没有匹配的文章'}</p>
              {totalPosts === 0 && (
                <Link href="/admin/posts/new" className="inline-flex rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:shadow-lg">
                  创建第一篇文章
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateUrl({ page: String(pagination.page - 1) })}
              disabled={pagination.page <= 1 || isPending}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => updateUrl({ page: String(pagination.page + 1) })}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
