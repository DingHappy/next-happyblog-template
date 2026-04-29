'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin/dashboard', label: '控制台', icon: '📊' },
    { href: '/admin/analytics', label: '访问统计', icon: '📈' },
    { href: '/admin/posts', label: '文章管理', icon: '📝' },
    { href: '/admin/categories', label: '分类管理', icon: '📁' },
    { href: '/admin/tags', label: '标签管理', icon: '🏷️' },
    { href: '/admin/friend-links', label: '友情链接', icon: '🔗' },
    { href: '/admin/comments', label: '评论管理', icon: '💬' },
    { href: '/admin/media', label: '图片管理', icon: '🖼️' },
    { href: '/admin/users', label: '用户管理', icon: '👥' },
    { href: '/admin/audit-logs', label: '审计日志', icon: '📋' },
    { href: '/admin/backup', label: '备份恢复', icon: '💾' },
    { href: '/admin/knowledge-sync', label: '知识库同步', icon: '🔄' },
    { href: '/admin/knowledge-export', label: '导出到知识库', icon: '📤' },
    { href: '/admin/settings', label: '系统设置', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 p-4 transition-colors flex flex-col">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
  );
}
