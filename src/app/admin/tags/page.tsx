import Link from 'next/link';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminTags() {
  if (!(await requireAuth())) {
    redirect('/admin');
  }

  // 获取所有标签及文章数
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🏷️ 标签管理
                </h1>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                共 {tags.length} 个标签
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
          {tags.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="text-5xl mb-4">🏷️</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">暂无标签</p>
              <p className="text-sm text-gray-400">编辑文章时添加标签，标签会自动创建</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/?tagId=${tag.id}`}
                    target="_blank"
                    className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-600 border border-purple-100 dark:border-purple-800 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                        {tag._count.posts} 篇文章
                      </span>
                      <span className="text-gray-400 group-hover:text-purple-600 transition-colors">→</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">
                      #{tag.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate font-mono">
                      slug: {tag.slug}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
