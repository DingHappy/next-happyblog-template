'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  slug?: string;
  title: string;
  excerpt: string;
  snippet?: string;
  matchedFields?: string[];
  category: {
    name: string;
    slug: string;
    color: string;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  coverImage: string | null;
  createdAt: string;
  _count: {
    comments: number;
  };
}

interface SearchSuggestions {
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({ categories: [], tags: [] });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const resetSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions({ categories: [], tags: [] });
    setTotal(0);
    setSelectedIndex(-1);
  }, []);

  const closeModal = useCallback(() => {
    resetSearch();
    onClose();
  }, [onClose, resetSearch]);

  // 搜索函数
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSuggestions({ categories: [], tags: [] });
      setTotal(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
      setSuggestions(data.suggestions || { categories: [], tags: [] });
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSuggestions({ categories: [], tags: [] });
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        closeModal();
        router.push(`/posts/${selected.slug || selected.id}`);
      }
    }
  }, [closeModal, results, selectedIndex, router]);

  // 转义正则特殊字符
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 高亮匹配文字
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const words = highlight.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return text;

    const pattern = words.map(escapeRegExp).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span 
          key={i} 
          className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-300 px-0.5 rounded font-medium"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />
      
      {/* 搜索弹窗 */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* 渐变装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        {/* 搜索输入 */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索文章标题、内容..."
              className="w-full pl-12 pr-12 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-400 text-base"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {query && !isLoading && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* 快捷键提示 */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
            <span>按 <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">Esc</kbd> 关闭</span>
            <span>按 <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">↑↓</kbd> 导航</span>
            <span>按 <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">Enter</kbd> 打开</span>
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() && !isLoading && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                找到 <span className="text-purple-600 font-bold">{total}</span> 篇相关文章
              </span>
            </div>
          )}

          {results.length > 0 ? (
            <div className="py-2">
              {results.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug || post.id}`}
                  onClick={onClose}
                  className={`block px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                    selectedIndex === index
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
                      post.category?.slug === 'daily'
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                    }`}>
                      {post.category?.name?.charAt(0) || '#'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 truncate">
                        {highlightText(post.title, query)}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {highlightText(post.snippet || post.excerpt, query)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                        <span>·</span>
                        <span>{post._count.comments} 评论</span>
                        {post.category && (
                          <>
                            <span>·</span>
                            <span>{post.category.name}</span>
                          </>
                        )}
                        {post.matchedFields && post.matchedFields.length > 0 && (
                          <>
                            <span>·</span>
                            <span>匹配 {post.matchedFields.join('/')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : query.trim() && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium">没有找到相关文章</p>
              {suggestions.categories.length > 0 || suggestions.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2 px-6">
                  {suggestions.categories.map((item) => (
                    <Link
                      key={`category-${item.id}`}
                      href={`/?categoryId=${item.id}`}
                      onClick={closeModal}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600"
                    >
                      {item.name}
                    </Link>
                  ))}
                  {suggestions.tags.map((item) => (
                    <Link
                      key={`tag-${item.id}`}
                      href={`/?tagId=${item.id}`}
                      onClick={closeModal}
                      className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600"
                    >
                      #{item.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm mt-1">试试其他关键词吧</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-5xl mb-4">💡</div>
              <p className="font-medium">输入关键词开始搜索</p>
              <p className="text-sm mt-1">支持搜索标题、内容、摘要</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
