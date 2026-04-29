'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';

interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getFullUrl = () => (
    typeof window !== 'undefined'
      ? `${window.location.origin}${url}`
      : url
  );

  const handleCopy = async () => {
    const success = await copyToClipboard(getFullUrl());
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(getFullUrl())}`,
      '_blank',
      'width=550,height=400'
    );
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: getFullUrl() });
      } catch {
        // 用户取消分享
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
          copied
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
        }`}
      >
        {copied ? '✓ 已复制' : '🔗 复制链接'}
      </button>

      <button
        onClick={shareToTwitter}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all duration-300"
      >
        🐦 Twitter
      </button>

      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-all duration-300"
      >
        📤 更多
      </button>
    </div>
  );
}
