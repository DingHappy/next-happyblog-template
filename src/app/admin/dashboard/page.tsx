import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function AdminDashboard() {
  if (!(await requireAuth())) {
    redirect('/admin');
  }

  // eslint-disable-next-line react-hooks/purity -- Server-rendered dashboard metrics are intentionally time-based.
  const since = new Date(Date.now() - 7 * DAY_MS);
  const sinceDay = startOfDay(since);

  const [
    postTotal,
    postPublished,
    postDrafts,
    commentTotal,
    commentPending,
    aggregates,
    popularPosts,
    latestComments,
    draftPosts,
    recentViews,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
    prisma.post.count({ where: { published: false } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { approved: false } }),
    prisma.post.aggregate({ _sum: { viewCount: true, likeCount: true } }),
    prisma.post.findMany({
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        viewCount: true,
        likeCount: true,
      },
    }),
    prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        post: { select: { id: true, slug: true, title: true } },
      },
    }),
    prisma.post.findMany({
      where: { published: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.postView.findMany({
      where: { createdAt: { gte: sinceDay } },
      select: { createdAt: true },
    }),
  ]);

  const totalViews = aggregates._sum.viewCount ?? 0;
  const totalLikes = aggregates._sum.likeCount ?? 0;

  // 把过去 7 天（含今天）按天分桶
  const today = startOfDay(new Date());
  const buckets: { label: string; date: Date; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS);
    buckets.push({ label: formatDay(date), date, count: 0 });
  }
  for (const v of recentViews) {
    const d = startOfDay(v.createdAt).getTime();
    const idx = buckets.findIndex((b) => b.date.getTime() === d);
    if (idx >= 0) buckets[idx].count++;
  }
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const weekViewTotal = buckets.reduce((s, b) => s + b.count, 0);

  const stats = [
    {
      label: '文章总数',
      value: postTotal,
      sub: `已发布 ${postPublished} · 草稿 ${postDrafts}`,
      icon: '📝',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: '评论数',
      value: commentTotal,
      sub: commentPending > 0 ? `${commentPending} 条待审核` : '已全部审核',
      icon: '💬',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      label: '总浏览量',
      value: totalViews,
      sub: `近 7 天 ${weekViewTotal}`,
      icon: '👁️',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: '总点赞数',
      value: totalLikes,
      sub: ' ',
      icon: '❤️',
      gradient: 'from-rose-500 to-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-6xl mx-auto pl-14 pr-6 py-4 md:px-6 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              ✨ 博客管理
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors"
              >
                查看博客
              </Link>
              <Link
                href="/admin/posts/new"
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                + 新建文章
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              控制台
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              整体数据一览
            </p>
          </div>

          {/* 概览卡片 */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {s.label}
                  </span>
                  <span
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-lg shadow-md`}
                  >
                    {s.icon}
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {s.value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {s.sub}
                </div>
              </div>
            ))}
          </section>

          {/* 趋势 + 热门 */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  最近 7 天浏览
                </h2>
                <span className="text-xs text-gray-400 tabular-nums">
                  共 {weekViewTotal} 次
                </span>
              </div>
              {weekViewTotal === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                  暂无数据
                </div>
              ) : (
                <div className="flex items-end gap-3 h-40">
                  {buckets.map((b) => {
                    const pct = (b.count / maxCount) * 100;
                    return (
                      <div
                        key={b.label}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg transition-all min-h-[2px]"
                            style={{ height: `${pct}%` }}
                            title={`${b.label}: ${b.count}`}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 tabular-nums">
                          {b.count}
                        </div>
                        <div className="text-[10px] text-gray-500 tabular-nums">
                          {b.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                热门文章
              </h2>
              {popularPosts.length === 0 ? (
                <div className="text-sm text-gray-400 py-6 text-center">
                  暂无文章
                </div>
              ) : (
                <ol className="space-y-3">
                  {popularPosts.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                            : i === 1
                            ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                            : i === 2
                            ? 'bg-gradient-to-br from-orange-300 to-amber-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Link
                        href={`/posts/${p.slug || p.id}`}
                        className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-200 hover:text-purple-600 truncate"
                      >
                        {p.title}
                      </Link>
                      <span className="text-xs text-gray-400 tabular-nums shrink-0">
                        👁️ {p.viewCount}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {/* 最新评论 + 草稿 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  最新评论
                </h2>
                <Link
                  href="/admin/comments"
                  className="text-xs text-purple-600 hover:underline"
                >
                  全部 →
                </Link>
              </div>
              {latestComments.length === 0 ? (
                <div className="text-sm text-gray-400 py-6 text-center">
                  暂无评论
                </div>
              ) : (
                <ul className="space-y-3">
                  {latestComments.map((c) => (
                    <li
                      key={c.id}
                      className="border-b border-gray-50 dark:border-slate-700 last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {c.author}
                        </span>
                        {!c.approved && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            待审核
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-1">
                        {c.content}
                      </p>
                      {c.post && (
                        <Link
                          href={`/posts/${c.post.slug || c.post.id}`}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          → {c.post.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  草稿
                </h2>
                <Link
                  href="/admin/posts"
                  className="text-xs text-purple-600 hover:underline"
                >
                  全部 →
                </Link>
              </div>
              {draftPosts.length === 0 ? (
                <div className="text-sm text-gray-400 py-6 text-center">
                  没有未发布的草稿 🎉
                </div>
              ) : (
                <ul className="space-y-3">
                  {draftPosts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 border-b border-gray-50 dark:border-slate-700 last:border-0 pb-3 last:pb-0"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <Link
                        href={`/admin/posts/${p.id}/edit`}
                        className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-200 hover:text-purple-600 truncate"
                      >
                        {p.title}
                      </Link>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
