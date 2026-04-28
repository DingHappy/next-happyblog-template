'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const initialTheme = savedTheme || (mediaQuery.matches ? 'dark' : 'light');
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }, 0);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem('theme')) return;
      const nextTheme = event.matches ? 'dark' : 'light';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      window.clearTimeout(timer);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-300"
      title={isMounted ? (theme === 'light' ? '切换到深色模式' : '切换到明亮模式') : '切换主题'}
      aria-label={isMounted ? (theme === 'light' ? '切换到深色模式' : '切换到明亮模式') : '切换主题'}
    >
      {!isMounted ? (
        <span className="h-5 w-5 rounded-full bg-gray-400/70 dark:bg-slate-400/70" />
      ) : theme === 'light' ? (
        // 明亮模式：显示月亮图标 - 确保是灰色
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="#6b7280" 
          className="hover:fill-gray-800 transition-colors"
        >
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        // 深色模式：显示太阳图标 - 黄色
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="#facc15" 
          className="hover:fill-yellow-300 transition-colors"
        >
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM18 12a.75.75 0 01.75.75v.001a.75.75 0 01-1.5 0V12.75A.75.75 0 0118 12zM4.5 12a.75.75 0 01.75.75v.001a.75.75 0 01-1.5 0V12.75a.75.75 0 01.75-.75zM17.657 6.343a.75.75 0 010 1.06l-1.591 1.591a.75.75 0 11-1.06-1.06l1.59-1.591a.75.75 0 011.06 0zM9.053 14.95a.75.75 0 010 1.06l-1.591 1.591a.75.75 0 11-1.06-1.06l1.59-1.591a.75.75 0 011.06 0zM17.657 17.657a.75.75 0 010 1.06l-1.591 1.591a.75.75 0 01-1.061-1.06l1.591-1.591a.75.75 0 011.06 0zM9.053 9.05a.75.75 0 010 1.06L7.462 11.7a.75.75 0 11-1.06-1.06l1.59-1.59a.75.75 0 011.06 0zM12 5.25a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5z" />
        </svg>
      )}
    </button>
  );
}
