'use client';

import { useEffect, useState } from 'react';

export default function PostMeta({
  postId,
  initialViewCount,
  initialLikeCount,
}: {
  postId: string;
  initialViewCount: number;
  initialLikeCount: number;
}) {
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  // 进页面就触发一次浏览量自增，拿回服务端真实计数
  useEffect(() => {
    fetch(`/api/posts/${postId}/view`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.viewCount === 'number') {
          setViewCount(data.viewCount);
        }
      })
      .catch(() => {});
  }, [postId]);

  // 监听 LikeButton 派发的事件，实时同步
  useEffect(() => {
    const onLike = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId === postId && typeof detail.count === 'number') {
        setLikeCount(detail.count);
      }
    };
    window.addEventListener('blog:like', onLike);
    return () => window.removeEventListener('blog:like', onLike);
  }, [postId]);

  return (
    <>
      <span className="text-sm text-gray-400 font-medium tabular-nums">👁️ {viewCount} 阅读</span>
      <span className="w-1 h-1 rounded-full bg-gray-200"></span>
      <span className="text-sm text-gray-400 font-medium tabular-nums">❤️ {likeCount}</span>
    </>
  );
}
