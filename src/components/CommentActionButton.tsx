'use client';

import { useConfirm, useToast } from '@/components/FeedbackProvider';

interface CommentActionButtonProps {
  commentId: string;
  approved: boolean;
}

export default function CommentActionButton({ commentId, approved }: CommentActionButtonProps) {
  const confirm = useConfirm();
  const toast = useToast();

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, { method: 'POST' });
      if (response.ok) {
        toast('评论已通过', 'success');
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        toast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      console.error('Failed to approve comment:', error);
      toast('操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: '确定要删除这条评论吗？' });
    if (!ok) return;

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
      if (response.ok) {
        toast('评论已删除', 'success');
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        toast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast('删除失败', 'error');
    }
  };

  return (
    <div className="flex items-center gap-3 justify-end">
      {!approved && (
        <button
          onClick={handleApprove}
          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium transition-colors"
        >
          通过
        </button>
      )}
      <button
        onClick={handleDelete}
        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium transition-colors"
      >
        删除
      </button>
    </div>
  );
}
