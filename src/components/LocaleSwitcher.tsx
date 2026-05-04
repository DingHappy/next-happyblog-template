'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPathnameLocale, localizePathname } from '@/i18n/pathname';
import { routing } from '@/i18n/routing';

const LABEL: Record<string, string> = {
  zh: '中',
  en: 'EN',
};

// 不在 [locale]/ 下的路径(admin 等)切换语言时,直接跳到目标语言的首页,
// 避免 /en/admin/... 这类本地化前缀指向不存在路由导致的 404。
const NON_LOCALIZED_PREFIXES = ['/admin'];

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const current = getPathnameLocale(pathname) ?? routing.defaultLocale;
  const next = routing.locales.find((l) => l !== current) ?? current;
  const isNonLocalized = NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
  if (isNonLocalized) return null;
  const href = localizePathname(pathname, next);

  return (
    <Link
      href={href}
      className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-gray-100 px-3 text-xs font-bold text-gray-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
      aria-label={`Switch to ${next}`}
      title={`Switch to ${next}`}
    >
      {LABEL[next] ?? next.toUpperCase()}
    </Link>
  );
}
