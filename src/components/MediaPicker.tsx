'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/FeedbackProvider';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

interface MediaPickerProps {
  onSelect: (url: string) => void;
}

export default function MediaPicker({ onSelect }: MediaPickerProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
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
  };

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        loadMedia();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await loadMedia();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast('上传失败，请重试', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelect = (url: string) => {
    onSelect(url);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
      >
        从媒体库选择
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">选择封面图</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">选择已有图片，或上传新的图片</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-82px)]">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {isUploading ? '上传中...' : '上传图片'}
                </button>
                <button
                  type="button"
                  onClick={loadMedia}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  刷新
                </button>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-gray-500 dark:text-gray-400">加载中...</div>
              ) : media.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-200 dark:border-slate-600 rounded-2xl">
                  <p className="text-gray-500 dark:text-gray-400">暂无图片</p>
                  <p className="text-xs text-gray-400 mt-1">上传后可在这里选择</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="group text-left bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-slate-700 overflow-hidden">
                        <Image
                          src={item.url}
                          alt={item.filename}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate" title={item.filename}>
                          {item.filename}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
