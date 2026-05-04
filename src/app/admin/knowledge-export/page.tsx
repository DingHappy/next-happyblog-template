'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { useToast } from '@/components/FeedbackProvider';

interface Post {
  id: string;
  title: string;
  published: boolean;
  createdAt: string;
  category?: { name: string };
  fileExists: boolean;
}

interface ExportResult {
  title: string;
  file: string;
  status: string;
  reason?: string;
  error?: string;
}

interface ExportResponse {
  success: boolean;
  summary: {
    total: number;
    exported: number;
    skipped: number;
  };
  results: ExportResult[];
}

export default function KnowledgeExportPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<ExportResponse | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/export-knowledge');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Load posts failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(posts.map(p => p.id)));
  };

  const selectNewOnly = () => {
    setSelectedIds(new Set(posts.filter(p => !p.fileExists).map(p => p.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast('请选择要导出的文章', 'info');
      return;
    }

    setIsExporting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/export-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postIds: Array.from(selectedIds),
          overwrite,
        }),
      });

      const data = await response.json();
      setResult(data);
      toast('导出任务完成', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      toast('导出失败：' + String(error), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exported':
        return 'bg-green-100 text-green-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-600';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exported':
        return '已导出';
      case 'skipped':
        return '已跳过';
      case 'error':
        return '错误';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📤 导出到知识库
                </Link>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-xs font-bold">
                  共 {posts.length} 篇
                </span>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedIds.size === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    导出中...
                  </>
                ) : (
                  '📤 导出选中'
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
          {/* 操作栏 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  全选
                </button>
                <button
                  onClick={selectNewOnly}
                  className="px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  仅选新增 ({posts.filter(p => !p.fileExists).length})
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  清空
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOverwrite(!overwrite)}
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    overwrite ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                      overwrite ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">覆盖已存在的文件</span>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              已选择 <span className="font-bold text-purple-600">{selectedIds.size}</span> 篇文章
            </div>
          </div>

          {/* 导出结果 */}
          {result && (
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{result.summary.total}</div>
                  <div className="text-sm text-gray-500">总选择</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{result.summary.exported}</div>
                  <div className="text-sm text-gray-500">已导出</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-gray-400">{result.summary.skipped}</div>
                  <div className="text-sm text-gray-500">已跳过</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">导出详情</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {result.results.map((item: ExportResult, index: number) => (
                    <div key={index} className="px-4 py-2.5 border-b border-gray-50 dark:border-slate-600/50 flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.title}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 文章列表 */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        选择
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        标题
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        分类
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        创建日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-600/50">
                    {posts.map((post) => (
                      <tr
                        key={post.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                          selectedIds.has(post.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                        }`}
                        onClick={() => toggleSelect(post.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedIds.has(post.id)
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-transparent'
                              : 'border-gray-300 dark:border-slate-600'
                          }`}>
                            {selectedIds.has(post.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {post.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {post.category?.name || '未分类'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                            post.fileExists
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {post.fileExists ? '知识库已存在' : '新增'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
