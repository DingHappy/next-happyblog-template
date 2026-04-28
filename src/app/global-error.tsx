'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="relative inline-block mb-8">
              <div className="text-[120px] font-black bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                500
              </div>
              <div className="absolute -top-4 -right-4 text-4xl animate-pulse">
                🚨
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              服务器出错了
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
              抱歉，服务器遇到了一些问题。我们的团队已经收到通知，正在紧急处理中。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重试
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                返回首页
              </Link>
            </div>

            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                  错误详情 (仅开发环境显示):
                </p>
                <code className="text-xs text-red-500 dark:text-red-300 font-mono break-all">
                  {error.message}
                </code>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}