'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // 检查是否已登录（带超时和错误保护）
  useEffect(() => {
    let cancelled = false;
    
    // 超时控制器：最多等 1.5 秒，超过直接显示登录表单
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
      if (!cancelled) {
        console.log('Auth check timed out, showing login form');
        setIsChecking(false);
      }
    }, 1500);

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth', {
          cache: 'no-store',
          signal: abortController.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        
        if (!cancelled && response.ok) {
          clearTimeout(timeoutId);
          window.location.href = '/admin/dashboard';
          return;
        }
      } catch (error) {
        // 静默失败，直接显示登录表单
        console.log('Auth check skipped:', error instanceof Error ? error.message : 'timeout');
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (response.ok) {
        window.location.href = '/admin/dashboard';
      } else {
        const data = await response.json();
        setError(data.error || '密码错误');
      }
    } catch {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              管理后台
            </h1>
            <p className="text-gray-500 mt-2 text-sm">使用后台账号登录</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名或邮箱"
                autoComplete="username"
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-400"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-300 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-400"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  登录中...
                </span>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          {process.env.NODE_ENV !== 'production' && (
            <p className="text-center text-xs text-gray-400 mt-6">
              开发默认账号：admin / admin123
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
