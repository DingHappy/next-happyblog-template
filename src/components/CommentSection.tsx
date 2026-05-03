'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/FeedbackProvider';

interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  email: string | null;
  content: string;
  approved: boolean;
  createdAt: Date;
  replies?: Comment[];
  date?: string;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
}

export default function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [formData, setFormData] = useState({
    author: '',
    email: '',
    content: '',
    website: '',
  });
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 页面加载时获取最新评论
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/comments?postId=${postId}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setComments(data);
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author || !formData.content) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          parentId: replyTo?.id,
          author: formData.author,
          email: formData.email || undefined,
          content: formData.content,
          website: formData.website,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        setFormData({ author: '', email: '', content: '', website: '' });
        setReplyTo(null);
        toast(data?.message || (replyTo ? '回复提交成功，审核后显示' : '评论提交成功，审核后显示'), 'success');
      } else if (response.status === 429) {
        toast('评论过于频繁，请稍后再试', 'error');
      } else if (response.status === 404) {
        toast('回复的评论不存在', 'error');
      } else {
        const data = await response.json().catch(() => ({}));
        toast(data.error || '评论提交失败', 'error');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarColors = [
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-green-400 to-emerald-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
  ];

  const formatCommentDate = (comment: Comment) => {
    const value = comment.createdAt || comment.date;
    if (!value) return '';
    return new Date(value).toLocaleDateString('zh-CN');
  };

  // 计算总评论数（含回复）
  const countTotalComments = (list: Comment[]): number => {
    return list.reduce((total, c) => {
      return total + 1 + (c.replies ? countTotalComments(c.replies) : 0);
    }, 0);
  };

  // 单个评论组件（支持嵌套）
  const CommentItem = ({ comment, depth = 0, index = 0 }: { comment: Comment; depth?: number; index?: number }) => (
    <div className="relative">
      <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-purple-100 transition-all duration-300 group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl" />
        <div className="flex items-start gap-5">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300`}>
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <span className="font-bold text-gray-900 text-lg">{comment.author}</span>
              <span className="text-sm text-gray-400 font-medium">
                {formatCommentDate(comment)}
              </span>
              <span className="px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                已审核
              </span>
            </div>
            {replyTo?.id === comment.id && (
              <div className="mb-3 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-sm text-purple-600">正在回复 @{replyTo.author}</span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="ml-3 text-purple-400 hover:text-purple-600 text-xs font-medium"
                >
                  取消
                </button>
              </div>
            )}
            <p className="text-gray-700 leading-relaxed text-base">{comment.content}</p>
            {!replyTo && depth < 2 && (
              <button
                onClick={() => setReplyTo({ id: comment.id, author: comment.author })}
                className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 transition-colors"
              >
                <span>↩️</span> 回复
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 嵌套回复 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-4 space-y-4">
          {comment.replies.map((reply, replyIndex) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              index={index + replyIndex + 1}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="border-t border-gray-100 pt-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/25">
          💬
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-purple-700 to-pink-600 bg-clip-text text-transparent">
            评论
          </h2>
          <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-purple-700 rounded-full text-sm font-bold">
            {countTotalComments(comments)}
          </span>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* 评论表单 */}
      <form onSubmit={handleSubmit} className="relative rounded-2xl overflow-hidden mb-10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-5" />
        <div className="relative bg-white p-8 border border-gray-100 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">✍️</span>
            {replyTo ? `回复 @${replyTo.author}` : '发表你的想法'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="昵称 *"
                value={formData.author}
                onChange={e => setFormData(prev => ({ ...prev, author: e.target.value }))}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:outline-none focus:border-purple-300 focus:bg-white transition-all duration-300 font-medium"
                required
              />
            </div>
            <div className="relative">
              <input
                type="email"
                placeholder="邮箱（选填，用于回复通知）"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:outline-none focus:border-purple-300 focus:bg-white transition-all duration-300 font-medium"
              />
            </div>
          </div>
          {/* 蜜罐字段：仅对自动化脚本可见 */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={formData.website}
            onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
            className="absolute left-[-9999px] top-[-9999px] w-px h-px opacity-0"
          />
          <div className="relative mb-6">
            <textarea
              placeholder={replyTo ? `回复 @${replyTo.author} 的想法... *` : '写下你的想法... *'}
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:outline-none focus:border-purple-300 focus:bg-white transition-all duration-300 resize-none font-medium"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  提交中...
                </span>
              ) : replyTo ? '发送回复' : '发表评论'}
            </button>
            {replyTo && (
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-6xl mb-6 animate-bounce">🛋️</div>
            <p className="text-gray-500 text-lg font-medium">暂无评论，来抢沙发吧！</p>
            <p className="text-gray-400 text-sm mt-2">成为第一个评论的人</p>
          </div>
        ) : (
          comments.map((comment, index) => (
            <CommentItem key={comment.id} comment={comment} depth={0} index={index} />
          ))
        )}
      </div>
    </section>
  );
}
