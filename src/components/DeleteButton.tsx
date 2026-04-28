'use client';

interface DeleteButtonProps {
  postId: string;
}

export default function DeleteButton({ postId }: DeleteButtonProps) {
  const handleDelete = async () => {
    if (confirm('确定要删除这篇文章吗？')) {
      await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-700 text-sm font-medium"
    >
      删除
    </button>
  );
}
