'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { useConfirm, useToast } from '@/components/FeedbackProvider';

interface PostVersion {
  id: string;
  version: number;
  title: string;
  createdAt: string;
}

interface PostVersionContent {
  id: string;
  version: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: string | null;
  coverImage: string | null;
  tags: string[];
  createdAt: string;
}

export default function PostVersionsPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [viewingVersion, setViewingVersion] = useState<PostVersion | null>(null);
  const [versionContent, setVersionContent] = useState<PostVersionContent | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Load versions error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const checkAuth = async () => {
        const res = await fetch('/api/admin/check-auth');
        if (!res.ok) {
          router.push('/admin');
          return;
        }
        await loadVersions();
      };
      void checkAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadVersions, router]);

  const viewVersion = async (version: PostVersion) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/versions/${version.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingVersion(version);
        setVersionContent(data);
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Load version detail error:', error);
    }
  };

  const handleRollback = async () => {
    if (!viewingVersion) return;
    if (!(await confirm({ message: `确定要回滚到版本 v${viewingVersion.version} 吗？当前状态会自动保存为新版本。` }))) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${postId}/versions/${viewingVersion.id}`, {
        method: 'POST',
      });
      if (res.ok) {
        toast('回滚成功', 'success');
        setViewingVersion(null);
        setVersionContent(null);
        startTransition(() => {
          void loadVersions();
        });
      } else {
        const data = await res.json();
        toast(data.error || '回滚失败', 'error');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      toast('回滚失败', 'error');
    }
  };

  const handleDeleteVersion = async (version: PostVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm({ message: `确定要删除版本 v${version.version} 吗？此操作不可恢复！` }))) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${postId}/versions/${version.id}/delete`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (viewingVersion?.id === version.id) {
          setViewingVersion(null);
          setVersionContent(null);
        }
        startTransition(() => {
          void loadVersions();
        });
        toast('版本已删除', 'success');
      } else {
        toast('删除失败', 'error');
      }
    } catch (error) {
      console.error('Delete version error:', error);
      toast('删除失败', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-6xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/posts"
                className="text-gray-400 hover:text-purple-600 transition-colors"
              >
                ← 返回文章列表
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📜 版本历史
              </h1>
              <span className="text-sm text-gray-400">
                文章 ID: {postId}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧版本列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden sticky top-24">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="font-bold text-gray-900 dark:text-white">历史版本</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    共 {versions.length} 个版本
                  </p>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📜</div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">暂无历史版本</p>
                    <p className="text-xs text-gray-400 mt-2">编辑文章时会自动保存版本</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                    {versions.map((version, index) => (
                       <div
                         key={version.id}
                         className={`w-full px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                           viewingVersion?.id === version.id
                             ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                             : ''
                         }`}
                       >
                         <div className="flex items-center justify-between mb-1">
                           <button
                             onClick={() => viewVersion(version)}
                             className="flex-1 text-left"
                           >
                             <span className="font-bold text-gray-900 dark:text-white">
                               v{version.version}
                             </span>
                           </button>
                           <div className="flex items-center gap-2">
                             {index === 0 && (
                               <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                 最新
                               </span>
                             )}
                             {versions.length > 1 && (
                               <button
                                 onClick={(e) => handleDeleteVersion(version, e)}
                                 className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                 title="删除版本"
                               >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                               </button>
                             )}
                           </div>
                         </div>
                         <button
                           onClick={() => viewVersion(version)}
                           className="w-full text-left"
                         >
                           <p className="text-sm text-gray-600 dark:text-gray-300 truncate mb-1">
                             {version.title}
                           </p>
                           <p className="text-xs text-gray-400">
                             {new Date(version.createdAt).toLocaleString('zh-CN')}
                           </p>
                         </button>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧版本详情 */}
            <div className="lg:col-span-2">
              {viewingVersion && versionContent ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900 dark:text-white">
                        v{viewingVersion.version} - {versionContent.title}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        创建于 {new Date(versionContent.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDiff(!showDiff)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        {showDiff ? '隐藏对比' : '显示对比'}
                      </button>
                      <button
                        onClick={handleRollback}
                        disabled={isPending}
                        className="px-4 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        👈 回滚到此版本
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 标题 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        标题
                      </label>
                      <p className="text-gray-900 dark:text-white text-lg font-medium">
                        {versionContent.title}
                      </p>
                    </div>

                    {/* Slug */}
                    {versionContent.slug && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Slug
                        </label>
                        <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">
                          /{versionContent.slug}
                        </p>
                      </div>
                    )}

                    {/* 摘要 */}
                    {versionContent.excerpt && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          摘要
                        </label>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          {versionContent.excerpt}
                        </p>
                      </div>
                    )}

                    {/* 标签 */}
                    {versionContent.tags && versionContent.tags.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          标签
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {versionContent.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 封面 */}
                    {versionContent.coverImage && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          封面图片
                        </label>
                        <div className="relative h-48 w-full max-w-md overflow-hidden rounded-xl">
                          <Image
                            src={versionContent.coverImage}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 448px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* 内容 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        文章内容
                      </label>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {versionContent.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center">
                  <div className="text-6xl mb-6">👈</div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    从左侧选择一个版本查看详情
                  </p>
                  <p className="text-sm text-gray-400">
                    可以对比不同版本的内容差异，或回滚到任意历史版本
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
