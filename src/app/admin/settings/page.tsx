'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import { useToast } from '@/components/FeedbackProvider';

interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  authorName: string;
  authorAvatar: string;
  authorBio: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
  seoDescription: string;
  seoKeywords: string;
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Load settings failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaved(false);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        toast('设置已保存', 'success');
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Save settings failed:', error);
      toast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateSocialLink = (platform: string, value: string) => {
    setSettings(prev => prev ? {
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    } : null);
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-4xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ⚙️ 系统设置
                </Link>
              </div>
              {saved && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  ✓ 已保存
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
          <form onSubmit={handleSave} className="space-y-8">
            {/* 基本设置 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">基本设置</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    网站标题
                  </label>
                  <input
                    type="text"
                    value={settings.siteTitle}
                    onChange={(e) => updateField('siteTitle', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    网站描述
                  </label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) => updateField('siteDescription', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    网站地址
                  </label>
                  <input
                    type="text"
                    value={settings.siteUrl}
                    onChange={(e) => updateField('siteUrl', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 作者信息 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">作者信息</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    作者姓名
                  </label>
                  <input
                    type="text"
                    value={settings.authorName}
                    onChange={(e) => updateField('authorName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    作者头像 URL
                  </label>
                  <input
                    type="text"
                    value={settings.authorAvatar}
                    onChange={(e) => updateField('authorAvatar', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    作者简介
                  </label>
                  <textarea
                    value={settings.authorBio}
                    onChange={(e) => updateField('authorBio', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 社交链接 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">社交链接</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    GitHub
                  </label>
                  <input
                    type="text"
                    value={settings.socialLinks.github || ''}
                    onChange={(e) => updateSocialLink('github', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="https://github.com/username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Twitter
                  </label>
                  <input
                    type="text"
                    value={settings.socialLinks.twitter || ''}
                    onChange={(e) => updateSocialLink('twitter', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="https://twitter.com/username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    value={settings.socialLinks.linkedin || ''}
                    onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="text"
                    value={settings.socialLinks.email || ''}
                    onChange={(e) => updateSocialLink('email', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            {/* SEO 设置 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">SEO 设置</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    SEO 默认描述
                  </label>
                  <textarea
                    value={settings.seoDescription}
                    onChange={(e) => updateField('seoDescription', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    SEO 关键词（逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={settings.seoKeywords}
                    onChange={(e) => updateField('seoKeywords', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="博客,技术,生活"
                  />
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex justify-end sticky bottom-8">
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '💾 保存设置'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
