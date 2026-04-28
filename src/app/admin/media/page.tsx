'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminSidebar from '@/components/AdminSidebar';
import { useConfirm, useToast } from '@/components/FeedbackProvider';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

export default function MediaPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/media');
      if (response.ok) {
        const data = await response.json();
        setMedia(data);
      }
    } catch (error) {
      console.error('Load media failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载图片列表
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedia();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMedia]);

  // 处理文件上传
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${file.name}`);
        }
      }

      await loadMedia();
      toast('图片上传成功', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      toast('上传失败，请重试', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 删除图片
  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: '确定要删除这张图片吗？' }))) return;

    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedia(prev => prev.filter(m => m.id !== id));
        toast('图片已删除', 'success');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  // 复制图片链接
  const handleCopyUrl = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast('链接已复制到剪贴板', 'success');
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast('链接已复制到剪贴板', 'success');
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ✨ 博客管理
                </Link>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-xs font-bold">
                  {media.length} 张图片
                </span>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center mb-8 transition-all duration-300 ${
              isDragging
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleUpload(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
            
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              上传图片
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              拖拽图片到这里，或点击选择文件
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? '⏳ 上传中...' : '选择图片'}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              支持 JPG、PNG、GIF、WebP，单文件最大 10MB
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-gray-500 dark:text-gray-400">还没有上传图片</p>
              <p className="text-sm text-gray-400 mt-2">上传的图片可以在文章中使用</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-slate-700">
                    <Image
                      src={item.url}
                      alt={item.filename}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleCopyUrl(item.url)}
                        className="p-2 bg-white rounded-lg text-gray-700 hover:text-purple-600 transition-colors shadow-lg"
                        title="复制链接"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-white rounded-lg text-gray-700 hover:text-red-600 transition-colors shadow-lg"
                        title="删除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.filename}>
                      {item.filename}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSize(item.size)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
