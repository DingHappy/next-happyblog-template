import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type ArchivePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
  isPublic: boolean;
  category: {
    name: string;
    color: string;
  } | null;
  tags: {
    id: string;
    name: string;
  }[];
  _count: {
    comments: number;
  };
};

type YearArchive = {
  year: string;
  posts: ArchivePost[];
};

function groupPostsByYear(posts: ArchivePost[]): YearArchive[] {
  const groups = new Map<string, ArchivePost[]>();

  for (const post of posts) {
    const year = String(post.createdAt.getFullYear());
    const yearPosts = groups.get(year) ?? [];
    yearPosts.push(post);
    groups.set(year, yearPosts);
  }

  return Array.from(groups.entries()).map(([year, yearPosts]) => ({
    year,
    posts: yearPosts,
  }));
}

function formatMonthDay(date: Date, locale: string) {
  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
  });
}

function formatFullDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default async function ArchivesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('archives');
  const isAdmin = await requireAuth();

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      isPublic: true,
      category: {
        select: {
          name: true,
          color: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const archives = groupPostsByYear(posts);
  const latestPost = posts[0];

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
      <header className="mb-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-purple-600 mb-3">
              Archives
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('title')}
            </h1>
            <p className="text-gray-500 leading-relaxed max-w-2xl">
              {t('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-0 md:min-w-[360px]">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
              <div className="text-xs text-gray-400 mt-1">{t('statPosts')}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{archives.length}</div>
              <div className="text-xs text-gray-400 mt-1">{t('statYears')}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">
                {latestPost ? latestPost.createdAt.getFullYear() : '-'}
              </div>
              <div className="text-xs text-gray-400 mt-1">{t('statLatest')}</div>
            </div>
          </div>
        </div>
      </header>

      {archives.length === 0 ? (
        <section className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('noPosts')}</h2>
          <p className="text-gray-500 mb-6">{t('noPostsHint')}</p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            {t('backHome')}
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)] gap-6">
          <aside className="hidden lg:block">
            <nav className="sticky top-20 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                {t('years')}
              </p>
              <div className="flex flex-col gap-1">
                {archives.map(({ year, posts: yearPosts }) => (
                  <a
                    key={year}
                    href={`#year-${year}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-purple-700 transition-all"
                  >
                    <span>{year}</span>
                    <span className="text-xs text-gray-400">{yearPosts.length}</span>
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          <div className="space-y-10">
            {archives.map(({ year, posts: yearPosts }) => (
              <section key={year} id={`year-${year}`} className="scroll-mt-24">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{year}</h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent" />
                  <span className="text-sm font-medium text-gray-400">{t('postCount', { count: yearPosts.length })}</span>
                </div>

                <div className="relative">
                  <div className="absolute left-[46px] top-4 bottom-4 w-px bg-gradient-to-b from-purple-200 via-gray-100 to-transparent hidden sm:block" />
                  <div className="space-y-4">
                    {yearPosts.map(post => (
                      <article key={post.id} className="relative grid grid-cols-1 sm:grid-cols-[96px_minmax(0,1fr)] gap-3 sm:gap-5">
                        <time
                          dateTime={post.createdAt.toISOString()}
                          className="sm:text-center text-sm font-bold text-gray-500 pt-5"
                          title={formatFullDate(post.createdAt, locale)}
                        >
                          {formatMonthDay(post.createdAt, locale)}
                        </time>

                        <Link href={`/${locale}/posts/${post.slug || post.id}`} className="group block">
                          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-purple-100 transition-all">
                             <div className="flex flex-wrap items-center gap-2 mb-3">
                               {post.category && (
                                 <span
                                   className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white"
                                   style={{ backgroundColor: post.category.color }}
                                 >
                                   {post.category.name}
                                 </span>
                               )}
                               {isAdmin && !post.isPublic && (
                                 <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700">
                                   {t('private')}
                                 </span>
                               )}
                               <span className="text-xs text-gray-400">
                                 {t('views', { count: post.viewCount })}
                               </span>
                              <span className="text-xs text-gray-300">/</span>
                              <span className="text-xs text-gray-400">
                                {t('comments', { count: post._count.comments })}
                              </span>
                              {post.likeCount > 0 && (
                                <>
                                  <span className="text-xs text-gray-300">/</span>
                                  <span className="text-xs text-gray-400">
                                    {t('likes', { count: post.likeCount })}
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors mb-2">
                              {post.title}
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                              {post.excerpt}
                            </p>

                            {post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {post.tags.slice(0, 4).map(tag => (
                                  <span
                                    key={tag.id}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                                  >
                                    #{tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
