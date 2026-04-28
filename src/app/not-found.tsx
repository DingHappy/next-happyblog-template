import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="relative inline-block mb-8">
          <div className="text-[120px] font-black bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            404
          </div>
          <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
            🤔
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          页面走丢了
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
          您访问的页面可能已经被删除、移动，或者根本不存在。
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            返回首页
          </Link>
          
          <Link
            href="/archives"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            查看归档
          </Link>
        </div>

        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 您可以尝试使用 
            <kbd className="mx-2 px-2 py-1 bg-white dark:bg-slate-700 rounded text-xs font-mono border border-gray-200 dark:border-slate-600">
              ⌘K
            </kbd>
            快速搜索文章
          </p>
        </div>
      </div>
    </div>
  );
}
