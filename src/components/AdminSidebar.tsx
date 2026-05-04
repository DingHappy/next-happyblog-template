'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Permission } from '@/lib/permissions';

type AuthState = {
  permissions: Permission[];
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/check-auth', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: AuthState | null) => {
        if (!cancelled && data?.permissions) setAuthState(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 抽屉打开时禁止背景滚动
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const menuItems: Array<{ href: string; label: string; icon: string; permission?: Permission }> = [
    { href: '/admin/dashboard', label: '控制台', icon: '📊' },
    { href: '/admin/analytics', label: '访问统计', icon: '📈', permission: 'analytics:read' },
    { href: '/admin/posts', label: '文章管理', icon: '📝', permission: 'content:manage' },
    { href: '/admin/categories', label: '分类管理', icon: '📁', permission: 'taxonomy:manage' },
    { href: '/admin/tags', label: '标签管理', icon: '🏷️', permission: 'taxonomy:manage' },
    { href: '/admin/friend-links', label: '友情链接', icon: '🔗', permission: 'taxonomy:manage' },
    { href: '/admin/comments', label: '评论管理', icon: '💬', permission: 'comments:moderate' },
    { href: '/admin/media', label: '图片管理', icon: '🖼️', permission: 'media:manage' },
    { href: '/admin/users', label: '用户管理', icon: '👥', permission: 'users:manage' },
    { href: '/admin/audit-logs', label: '审计日志', icon: '📋', permission: 'audit:read' },
    { href: '/admin/backup', label: '备份恢复', icon: '💾', permission: 'backup:manage' },
    { href: '/admin/knowledge-sync', label: '知识库同步', icon: '🔄', permission: 'knowledge:sync' },
    { href: '/admin/knowledge-export', label: '导出到知识库', icon: '📤', permission: 'knowledge:sync' },
    { href: '/admin/settings', label: '系统设置', icon: '⚙️', permission: 'settings:manage' },
  ];
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    if (!authState) return false;
    return authState.permissions.includes(item.permission);
  });

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  };

  return (
    <>
      {/* 移动端汉堡按钮 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md text-gray-700 dark:text-gray-200"
        aria-label="打开菜单"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* 移动端遮罩 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 p-4 transition-all duration-300 flex flex-col
          fixed inset-y-0 left-0 z-50 transform overflow-y-auto
          ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          md:static md:translate-x-0 md:shadow-none md:transform-none md:transition-colors
        `}
      >
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="font-bold text-gray-700 dark:text-gray-200">管理菜单</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
            aria-label="关闭菜单"
          >
            ✕
          </button>
        </div>
        <nav className="space-y-2">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                pathname === item.href
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-all duration-300"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">退出登录</span>
          </button>
        </div>
      </aside>
    </>
  );
}
