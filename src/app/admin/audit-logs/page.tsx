'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { useToast } from '@/components/FeedbackProvider';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
}

const actionLabels: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  logout: '登出',
  publish: '发布',
  unpublish: '取消发布',
  approve: '审核通过',
  reject: '拒绝',
  export: '导出',
  import: '导入',
  backup: '备份',
  restore: '恢复',
};

const resourceLabels: Record<string, string> = {
  post: '文章',
  comment: '评论',
  category: '分类',
  tag: '标签',
  user: '用户',
  setting: '设置',
  media: '媒体',
  system: '系统',
  session: '会话',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  backup: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  restore: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '50',
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
      });

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast('加载审计日志失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.action, filters.resource, page, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  const formatJson = (data: string | null) => {
    if (!data) return '无';
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
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
                  📋 审计日志
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          <div className="mb-6 flex flex-wrap gap-4">
            <select
              value={filters.resource}
              onChange={(e) => {
                setFilters({ ...filters, resource: e.target.value });
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部资源</option>
              {Object.entries(resourceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filters.action}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value });
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部操作</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-gray-500 dark:text-gray-400">暂无审计日志</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {logs.map((log) => (
                  <div key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {actionLabels[log.action] || log.action}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {resourceLabels[log.resource] || log.resource}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {log.user?.displayName || log.user?.username || '系统'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {log.ipAddress}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(log.createdAt).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <span className="text-gray-400">
                            {expandedLog === log.id ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {expandedLog === log.id && (
                      <div className="px-6 pb-4 space-y-3">
                        {log.oldData && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">变更前</p>
                            <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-400 overflow-x-auto max-h-40">
                              {formatJson(log.oldData)}
                            </pre>
                          </div>
                        )}
                        {log.newData && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">变更后</p>
                            <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-400 overflow-x-auto max-h-40">
                              {formatJson(log.newData)}
                            </pre>
                          </div>
                        )}
                        {log.userAgent && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">User Agent</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{log.userAgent}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  第 {page} / {totalPages} 页
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
