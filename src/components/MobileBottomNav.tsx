'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPathnameLocale, localizePathname } from '@/i18n/pathname';
import { routing } from '@/i18n/routing';

const NAV_LABELS = {
  zh: { home: '首页', archives: '归档', about: '关于', admin: '管理' },
  en: { home: 'Home', archives: 'Archives', about: 'About', admin: 'Admin' },
} as const;

const NAV_ITEMS = [
  { href: '/', key: 'home', icon: '🏠', i18n: true },
  { href: '/archives', key: 'archives', icon: '📅', i18n: true },
  { href: '/about', key: 'about', icon: '👤', i18n: true },
  { href: '/admin', key: 'admin', icon: '⚙️', i18n: false },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const locale = getPathnameLocale(pathname) ?? routing.defaultLocale;
  const labels = NAV_LABELS[locale];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label={locale === 'zh' ? '移动端底部导航' : 'Mobile bottom navigation'}
    >
      <div className="flex items-center justify-around border-t border-purple-200 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {NAV_ITEMS.map((item) => {
          const href = item.i18n ? localizePathname(item.href, locale) : item.href;
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={item.key}
              href={href}
              className={`flex flex-col items-center gap-1 py-3 px-5 transition-all duration-300 ${
                isActive
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-xs font-medium">{labels[item.key]}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-slate-900/95" />
    </nav>
  );
}
