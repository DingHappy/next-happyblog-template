'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { useToast } from '@/components/FeedbackProvider';

interface BackupFile {
  filename: string;
  createdAt: string;
  size: number;
}

export default function AdminBackup() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blog-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast('备份成功，文件已下载', 'success');
        loadBackups();
      } else {
        toast('备份失败', 'error');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast('备份失败', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup', { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Load backups error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('警告：恢复操作将覆盖现有数据，确定要继续吗？')) {
      e.target.value = '';
      return;
    }
    const confirmation = prompt('请输入 RESTORE 确认恢复操作。系统会先自动备份当前数据。');
    if (confirmation?.trim().toUpperCase() !== 'RESTORE') {
      toast('恢复已取消', 'info');
      e.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('confirmation', confirmation);

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast(`数据恢复成功，恢复前备份：${data.preRestoreBackup || '已创建'}`, 'success');
        loadBackups();
      } else {
        const data = await res.json();
        toast(data.error || '恢复失败', 'error');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast('恢复失败', 'error');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  const handleRestoreFromServer = async (filename: string) => {
    if (!confirm(`警告：确定要从备份 ${filename} 恢复吗？这将覆盖所有现有数据！`)) {
      return;
    }
    const confirmation = prompt('请输入 RESTORE 确认恢复操作。系统会先自动备份当前数据。');
    if (confirmation?.trim().toUpperCase() !== 'RESTORE') {
      toast('恢复已取消', 'info');
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/backup?filename=${encodeURIComponent(filename)}&confirmation=${encodeURIComponent(confirmation)}`, { 
        method: 'DELETE' 
      });
      if (res.ok) {
        const data = await res.json();
        toast(`数据恢复成功，恢复前备份：${data.preRestoreBackup || '已创建'}`, 'success');
        loadBackups();
      } else {
        const data = await res.json();
        toast(data.error || '恢复失败', 'error');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast('恢复失败', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-6xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  💾 数据备份与恢复
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  数据备份
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  导出所有文章、评论、分类、标签、用户、设置等数据为 JSON 格式
                </p>

                <button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backingUp ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⟳</span> 正在备份...
                    </span>
                  ) : (
                    '开始备份'
                  )}
                </button>

                <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 space-y-1 text-left">
                  <p>✓ 文章内容 + 版本历史</p>
                  <p>✓ 评论数据</p>
                  <p>✓ 分类与标签</p>
                  <p>✓ 用户账号信息</p>
                  <p>✓ 系统设置</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🔄</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  数据恢复
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  从备份文件恢复数据，将覆盖现有数据（操作不可撤销）
                </p>

                <label className="w-full block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    disabled={restoring}
                    className="hidden"
                  />
                  <div className="w-full px-6 py-3 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    {restoring ? (
                      <span className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="animate-spin">⟳</span> 正在恢复...
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">
                        点击上传备份文件
                      </span>
                    )}
                  </div>
                </label>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ <strong>警告</strong>：恢复操作会覆盖所有现有数据。系统会在恢复前自动创建一份 pre-restore 备份，并要求输入 RESTORE 二次确认。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              备份历史
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : backups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                暂无备份文件，手动创建第一个备份吧！
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        文件名
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        大小
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {backups.map((backup) => (
                      <tr key={backup.filename}>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-900 dark:text-white font-mono">
                            {backup.filename}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(backup.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatSize(backup.size)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRestoreFromServer(backup.filename)}
                            disabled={restoring}
                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            恢复此版本
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors p-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              使用说明
            </h3>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p>定期备份数据，建议至少每周一次。发布大量内容前建议先备份。</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p>备份文件包含所有博客数据，请妥善保管，不要公开分享。</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p>恢复操作不可撤销，恢复前务必备份当前状态，确认后再操作。</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <p>建议将备份文件存储在安全的位置，如加密云盘或本地存储。</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                <p>可配置 Cron 定时任务每天调用 `/api/auto-backup` 实现自动备份，需要设置 `CRON_SECRET` 环境变量。</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
