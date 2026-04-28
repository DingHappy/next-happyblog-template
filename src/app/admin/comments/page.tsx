import Link from 'next/link';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import CommentActionButton from '@/components/CommentActionButton';
import AdminSidebar from '@/components/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminComments() {
  if (!(await requireAuth())) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">请先登录</p>
          <Link
            href="/admin"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  // 获取所有评论
  const comments = await prisma.comment.findMany({
    include: {
      post: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const pendingCount = comments.filter(c => !c.approved).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      {/* 左侧边栏 */}
      <AdminSidebar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ✨ 博客管理
                </Link>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-bold">
                    {pendingCount} 待审核
                  </span>
                )}
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </header>

        {/* 评论列表 */}
        <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-600 transition-colors">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    评论者
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    内容
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    所属文章
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 transition-colors">
                {comments.map((comment) => (
                  <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{comment.author}</p>
                          {comment.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{comment.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{comment.content}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/posts/${comment.post?.slug || comment.postId}`}
                        target="_blank"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium max-w-32 truncate block"
                      >
                        {comment.post?.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        comment.approved
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {comment.approved ? '✅ 已审核' : '⏳ 待审核'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <CommentActionButton
                        commentId={comment.id}
                        approved={comment.approved}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {comments.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-500 dark:text-gray-400">还没有评论</p>
              </div>
            )}
          </div>
         </div>
       </main>
      </div>
    </div>
  );
}
