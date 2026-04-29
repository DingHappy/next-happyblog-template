'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '首页', icon: '🏠' },
    { href: '/archives', label: '归档', icon: '📅' },
    { href: '/about', label: '关于', icon: '👤' },
    { href: '/admin', label: '管理', icon: '⚙️' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label="移动端底部导航"
    >
      <div className="flex items-center justify-around border-t border-purple-200 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-5 transition-all duration-300 ${
                isActive
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-slate-900/95" />
    </nav>
  );
}
