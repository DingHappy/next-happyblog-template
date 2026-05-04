'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import LocaleSwitcher from './LocaleSwitcher';
import { getPathnameLocale, localizePathname, normalizeLocalePathname } from '@/i18n/pathname';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/config/site';

// `i18n: true` routes auto-prefix with the active locale (must exist under
// src/app/[locale]/...). `i18n: false` routes link to the legacy non-prefixed
// path; useful while we migrate one page at a time.
const NAV_LINKS = [
  { href: '/', key: 'home', i18n: true },
  { href: '/archives', key: 'archives', i18n: true },
  { href: '/about', key: 'about', i18n: true },
] as const;

const NAV_LABELS = {
  zh: {
    home: '首页',
    archives: '归档',
    about: '关于',
  },
  en: {
    home: 'Home',
    archives: 'Archives',
    about: 'About',
  },
} as const;

type SearchResult = {
  id: string;
  slug?: string;
  title: string;
  excerpt: string;
  category?: string | {
    slug?: string;
  } | null;
};

export default function Navbar() {
  const pathname = usePathname();
  const locale = getPathnameLocale(pathname) ?? routing.defaultLocale;
  const normalizedPathname = normalizeLocalePathname(pathname);
  const navLabels = NAV_LABELS[locale];
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 键盘快捷键 Ctrl/Cmd + K 打开搜索
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsSearchOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setIsMenuOpen(false);
    }
  }, [setIsMenuOpen, setIsSearchOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 搜索功能
  useEffect(() => {
    const query = searchQuery.trim();

    const timer = setTimeout(async () => {
      if (!query) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, query ? 200 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* 移动端菜单遮罩 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[9998] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div
            ref={menuRef}
            className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-100 dark:border-slate-800"
            style={{ transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease' }}
          >
            {/* 菜单头部 */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                菜单
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 导航链接 */}
            <nav className="p-4 flex flex-col gap-2">
              {NAV_LINKS.map(link => {
                const href = link.i18n ? localizePathname(link.href, locale) : link.href;
                const isActive = link.i18n
                  ? normalizedPathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
                const className = `inline-flex items-center h-12 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:text-purple-600 dark:hover:text-purple-300'
                }`;
                const onClick = () => setIsMenuOpen(false);
                return link.i18n ? (
                  <Link key={link.href} href={href} onClick={onClick} className={className}>
                    {navLabels[link.key]}
                  </Link>
                ) : (
                  <Link key={link.href} href={href} onClick={onClick} className={className}>
                    {navLabels[link.key]}
                  </Link>
                );
              })}
            </nav>

            {/* 菜单底部 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">主题</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索弹窗 */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          />
           <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 z-[10000]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
             <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <div className="relative">
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                  stroke="#9ca3af" 
                  strokeWidth={2}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文章标题、内容..."
                   style={{ backgroundColor: '#f9fafb', color: '#1f2937' }}
                   className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-base placeholder-gray-400"
                />
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {searchQuery && !isLoading && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>按 <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">Esc</kbd> 关闭</span>
                <span>快捷键: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">⌘K</kbd></span>
              </div>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((post) => (
                    (() => {
                      const categorySlug = typeof post.category === 'string'
                        ? post.category
                        : post.category?.slug;
                      const isDaily = categorySlug === 'daily' || categorySlug === 'life';

                      return (
                        <Link
                          key={post.id}
                          href={localizePathname(`/posts/${post.slug || post.id}`, locale)}
                          onClick={() => setIsSearchOpen(false)}
                          className="block px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
                              isDaily
                                ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                                : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                            }`}>
                              {isDaily ? '🌱' : '💻'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{post.title}</h4>
                              <p className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })()
                  ))}
                </div>
              ) : searchQuery.trim() && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="font-medium">没有找到相关文章</p>
                  <p className="text-sm mt-1">试试其他关键词吧</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                  <div className="text-5xl mb-4">💡</div>
                  <p className="font-medium">输入关键词开始搜索</p>
                  <p className="text-sm mt-1">支持搜索标题、内容、摘要</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="w-full h-auto sticky top-0 z-40 border-b border-gray-100 bg-white-opacity-80 backdrop-blur-xl overflow-x-hidden shadow-sm">
        <div className="w-full h-full py-2 max-w-[1400px] mx-auto">
          <div className="flex flex-row items-center justify-between gap-2 lg:gap-4 xl:gap-6 px-4 py-1">
            <Link href={localizePathname('/', locale)} className="flex flex-row items-center gap-2 shrink-0 group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{siteConfig.logoEmoji}</span>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {siteConfig.name}
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex lg:flex-row items-center justify-between flex-grow gap-2">
              <nav className="flex flex-1 items-center justify-center gap-1">
                {NAV_LINKS.map(link => {
                  const href = link.i18n ? localizePathname(link.href, locale) : link.href;
                  const isActive = link.i18n
                    ? normalizedPathname === link.href
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                  const className = `inline-flex h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-800 dark:hover:to-slate-700 hover:text-purple-600 dark:hover:text-purple-300'
                  }`;
                  return link.i18n ? (
                    <Link key={link.href} href={href} className={className}>{navLabels[link.key]}</Link>
                  ) : (
                    <Link key={link.href} href={href} className={className}>{navLabels[link.key]}</Link>
                  );
                })}
              </nav>

              <div className="flex flex-row gap-2 items-center">
                <LocaleSwitcher />
                {/* 主题切换 */}
                <ThemeToggle />
                
                {/* 搜索按钮 */}
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="group inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/25 dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
                >
                   <svg 
                     className="h-4 w-4 mr-1.5 fill-current" 
                     viewBox="0 0 15 15" 
                     width="15" 
                     height="15" 
                   >
                    <path d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z" />
                  </svg>
                   <span className="hidden sm:inline">搜索</span>
                  <kbd className="ml-2 hidden items-center rounded bg-white/60 px-1.5 py-0.5 text-xs font-medium text-gray-500 group-hover:text-white dark:bg-slate-700 dark:text-gray-300 sm:inline-flex">
                    ⌘K
                  </kbd>
                </button>
              </div>
            </div>

            {/* Mobile 搜索和菜单按钮 */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
              >
                 <svg
                   className="h-4 w-4 fill-current"
                   viewBox="0 0 15 15"
                   width="15"
                   height="15"
                 >
                   <path d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z" />
                 </svg>
              </button>
              <button
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white dark:bg-slate-800 dark:text-gray-300 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
