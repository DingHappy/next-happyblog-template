'use client';

import { useEffect, useState } from 'react';

export default function LikeButton({
  postId,
  initialCount,
}: {
  postId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  // 挂载后再读 localStorage，避免 SSR/CSR 初值不一致导致 hydration mismatch
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLiked(localStorage.getItem(`liked:${postId}`) === '1');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [postId]);

  // 数字变化即广播，PostMeta 监听后同步顶部计数
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('blog:like', { detail: { postId, count } })
    );
  }, [count, postId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.likeCount === 'number') setCount(data.likeCount);
      if (next) localStorage.setItem(`liked:${postId}`, '1');
      else localStorage.removeItem(`liked:${postId}`);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all disabled:opacity-60 ${
        liked
          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40'
          : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-500 hover:shadow-md'
      }`}
    >
      <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
      <span className="tabular-nums">{count}</span>
      <span className="text-xs font-medium opacity-80">{liked ? '已点赞' : '点赞'}</span>
    </button>
  );
}
