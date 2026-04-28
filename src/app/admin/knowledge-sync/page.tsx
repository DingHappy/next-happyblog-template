'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { useConfirm, useToast } from '@/components/FeedbackProvider';

interface SyncResult {
  file: string;
  status: string;
  reason?: string;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    pruned?: number;
  };
  results: SyncResult[];
}

// 知识库可同步的分类
const KNOWLEDGE_CATEGORIES = [
  { id: 'tech', name: '技术', folder: 'tech' },
  { id: 'life', name: '生活', folder: 'life' },
  { id: 'projects', name: '项目', folder: 'projects' },
  { id: 'tools', name: '工具', folder: 'tools' },
  { id: 'uncategorized', name: '未分类', folder: 'root' },
];

export default function KnowledgeSyncPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [skipIndexFiles, setSkipIndexFiles] = useState(true);
  const [prune, setPrune] = useState(false);

  const handleSync = async () => {
    if (prune) {
      const ok = await confirm({ message: '已开启「修剪孤儿」：源文件已删除的文章会被永久删除。继续吗？' });
      if (!ok) return;
    }
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/sync-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryFilter: selectedCategories.length > 0 ? selectedCategories : undefined,
          prune,
        }),
      });

      const data = await response.json();
      setResult(data);
      toast('知识库同步完成', 'success');
    } catch (error) {
      console.error('Sync failed:', error);
      toast('同步失败：' + String(error), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAll = () => {
    setSelectedCategories(KNOWLEDGE_CATEGORIES.map(c => c.id));
  };

  const clearAll = () => {
    setSelectedCategories([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-600';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pruned':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created':
        return '新建';
      case 'updated':
        return '更新';
      case 'skipped':
        return '跳过';
      case 'error':
        return '错误';
      case 'pruned':
        return '已删除';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📚 知识库同步
                </Link>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    同步中...
                  </>
                ) : (
                  '🔄 开始同步'
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">同步说明</h2>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">📖</span>
                  <span>扫描环境变量 <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">KNOWLEDGE_BASE_PATH</code> 指向目录下的所有 Markdown 文件</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">🏷️</span>
                  <span>根据目录路径自动映射分类（如 <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">tech/</code> → 「tech」分类）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">🌐</span>
                  <span>包含 <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">#public</code> 标签的文章会自动设为公开</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">⚡</span>
                  <span>根据内容哈希自动检测变更，无变更的文件会跳过</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">同步配置</h2>
              
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  选择要同步的分类
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedCategories.length === 0 ? '未选择分类将同步全部' : `已选择 ${selectedCategories.length} 个分类`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSkipIndexFiles(!skipIndexFiles)}
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    skipIndexFiles ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                      skipIndexFiles ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  跳过索引文件（<code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">index.md</code>, <code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">README.md</code>）
                </span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setPrune(!prune)}
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    prune ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                      prune ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  修剪孤儿：源文件已删除的文章一并删除
                  {prune && <span className="ml-2 text-orange-600 font-bold">⚠️ 不可恢复</span>}
                </span>
              </div>
            </div>
          </div>

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{result.summary.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">总文件数</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{result.summary.created}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">新建文章</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{result.summary.updated}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">更新文章</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-gray-400">{result.summary.skipped}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">跳过</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
                  <div className="text-3xl font-bold text-orange-500">{result.summary.pruned ?? 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">已删除</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">同步详情</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
                  {result.results.map((item, index) => (
                    <div key={index} className="px-6 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.file}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!result && !isSyncing && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">准备开始同步</p>
              <p className="text-sm text-gray-400">点击右上角「开始同步」按钮</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
