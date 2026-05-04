'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { useConfirm, useToast } from '@/components/FeedbackProvider';

interface FriendLink {
  id: string;
  name: string;
  url: string;
  description: string | null;
  avatar: string | null;
  isVisible: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm: Omit<FriendLink, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  url: '',
  description: '',
  avatar: '',
  isVisible: true,
  order: 0,
};

export default function AdminFriendLinks() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/friend-links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error('Load links error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const checkAuth = async () => {
        const res = await fetch('/api/admin/check-auth');
        if (!res.ok) {
          router.push('/admin');
          return;
        }
        await loadLinks();
      };
      void checkAuth();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLinks, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;

    try {
      const res = editingId
        ? await fetch(`/api/admin/friend-links/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
        : await fetch('/api/admin/friend-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });

      if (res.ok) {
        closeModal();
        toast(editingId ? '友情链接已更新' : '友情链接已添加', 'success');
        startTransition(() => {
          void loadLinks();
        });
      } else {
        const data = await res.json();
        toast(data.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('Save link error:', error);
      toast('保存失败', 'error');
    }
  };

  const handleEdit = (link: FriendLink) => {
    setEditingId(link.id);
    setFormData({
      name: link.name,
      url: link.url,
      description: link.description,
      avatar: link.avatar,
      isVisible: link.isVisible,
      order: link.order,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: '确定删除这个友情链接吗？' }))) return;

    try {
      const res = await fetch(`/api/admin/friend-links/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('友情链接已删除', 'success');
        startTransition(() => {
          void loadLinks();
        });
      }
    } catch (error) {
      console.error('Delete link error:', error);
      toast('删除失败', 'error');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🔗 友情链接管理
              </h1>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                + 添加友情链接
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="text-5xl mb-4">🔗</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">暂无友情链接</p>
              <p className="text-sm text-gray-400">点击右上角按钮添加第一个友情链接</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl shrink-0 overflow-hidden">
                      {link.avatar ? (
                        <Image
                          src={link.avatar}
                          alt={link.name}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        '🌐'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{link.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          link.isVisible
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {link.isVisible ? '显示' : '隐藏'}
                        </span>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline truncate block mb-2"
                      >
                        {link.url}
                      </a>
                      {link.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{link.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(link)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 添加/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? '编辑友情链接' : '添加友情链接'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  网站名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例如：张三的博客"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  网站地址 *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  网站描述
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                  placeholder="简短介绍一下这个网站"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo 地址
                </label>
                <input
                  type="url"
                  value={formData.avatar || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    排序
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isVisible"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isVisible: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="isVisible" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    显示在首页
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {editingId ? '保存修改' : '添加链接'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
