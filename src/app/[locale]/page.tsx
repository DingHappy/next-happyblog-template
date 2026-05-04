import PlainLink from 'next/link';
import Image from 'next/image';
import type { Prisma } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { siteConfig } from '@/config/site';
import { WebSiteJsonLd, OrganizationJsonLd } from '@/components/JsonLd';
import LazyImage from '@/components/LazyImage';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        posts: true;
      };
    };
  };
}>;

type CategoryTree = CategoryWithCount & {
  children: CategoryTree[];
};

type HomePost = Prisma.PostGetPayload<{
  include: {
    category: true;
    tags: true;
    _count: {
      select: {
        comments: true;
      };
    };
  };
}>;

type HomeTag = Prisma.TagGetPayload<{
  include: {
    _count: {
      select: {
        posts: true;
      };
    };
  };
}>;

type ArchivePost = Pick<Prisma.PostGetPayload<Record<string, never>>, 'createdAt'>;

type RecentComment = Prisma.CommentGetPayload<{
  include: {
    post: {
      select: {
        title: true;
        id: true;
      };
    };
  };
}>;

async function buildCategoryTree(parentId: string | null = null, isAdmin: boolean = false): Promise<CategoryTree[]> {
  const categories = await prisma.category.findMany({
    where: { parentId },
    orderBy: { order: 'asc' },
    include: {
       _count: {
         select: { posts: { where: isAdmin ? { published: true } : { published: true, isPublic: true } } }
       }
    }
  });

  const result: CategoryTree[] = [];
  for (const cat of categories) {
    const children = await buildCategoryTree(cat.id, isAdmin);
    const childPostCount = children.reduce((sum, c) => sum + c._count.posts, 0);
    result.push({
      ...cat,
      children,
      _count: { posts: cat._count.posts + childPostCount }
    });
  }
  return result;
}

function CategoryLink({ cat, categoryId, level = 0 }: { cat: CategoryTree; categoryId?: string; level?: number }) {
  const hasChildren = cat.children && cat.children.length > 0;

  return (
    <>
      <Link
        key={cat.id}
        href={{ pathname: '/', query: { categoryId: cat.id } }}
        className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          categoryId === cat.id
            ? 'text-white'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700/60'
        }`}
        style={categoryId === cat.id ? { backgroundColor: cat.color, marginLeft: level * 12 } : { marginLeft: level * 12 }}
      >
        <span className="flex-grow truncate">{cat.name}</span>
        <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full border ${
          categoryId === cat.id
            ? 'bg-white/20 text-white border-white/30'
            : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700'
        }`}>{cat._count.posts}</span>
      </Link>
      {hasChildren && cat.children.map((child) => (
        <CategoryLink key={child.id} cat={child} categoryId={categoryId} level={level + 1} />
      ))}
    </>
  );
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ categoryId?: string; tagId?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

  const { categoryId, tagId, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 10;

  const isAdmin = await requireAuth().catch(() => false);

  const whereClause: Prisma.PostWhereInput = {
    published: true,
    ...(isAdmin ? {} : { isPublic: true }),
  };
  if (categoryId) {
    whereClause.categoryId = categoryId;
  }
  if (tagId) {
    whereClause.tags = {
      some: { id: tagId },
    };
  }

  let databaseUnavailable = false;
  let posts: HomePost[] = [];
  let categories: CategoryTree[] = [];
  let totalPosts = 0;
  let filteredPostCount = 0;
  let tags: HomeTag[] = [];
  let archivePosts: ArchivePost[] = [];
  let recentComments: RecentComment[] = [];
  let friendLinks: Prisma.FriendLinkGetPayload<Record<string, never>>[] = [];

  try {
    [posts, categories, totalPosts, filteredPostCount, tags, archivePosts, recentComments, friendLinks] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          category: true,
          tags: true,
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      buildCategoryTree(null, isAdmin),
      prisma.post.count({ where: isAdmin ? { published: true } : { published: true, isPublic: true } }),
      prisma.post.count({ where: whereClause }),
      prisma.tag.findMany({
        include: {
          _count: {
            select: {
               posts: {
                 where: isAdmin ? { published: true } : { published: true, isPublic: true },
               },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.post.findMany({
        where: isAdmin ? { published: true } : { published: true, isPublic: true },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: { title: true, id: true },
          },
        },
      }),
      prisma.friendLink.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      }),
    ]);
  } catch (error) {
    databaseUnavailable = true;
    console.error('Home data load failed:', error);
  }

  const visibleTags = tags.filter(tag => tag._count.posts > 0);
  const totalTags = visibleTags.length;
  const totalPages = Math.ceil(filteredPostCount / pageSize);
  const archiveYears = Array.from(
    archivePosts.reduce((groups, post) => {
      const year = post.createdAt.getFullYear();
      groups.set(year, (groups.get(year) || 0) + 1);
      return groups;
    }, new Map<number, number>())
  );

  function countCategories(cats: CategoryTree[]): number {
    let count = cats.length;
    for (const cat of cats) {
      if (cat.children && cat.children.length > 0) {
        count += countCategories(cat.children);
      }
    }
    return count;
  }

  const totalCategories = countCategories(categories);

  const buildPageHref = (n: number) => ({
    pathname: '/' as const,
    query: {
      page: n,
      ...(categoryId ? { categoryId } : {}),
      ...(tagId ? { tagId } : {}),
    },
  });

  return (
    <>
      <WebSiteJsonLd />
      <OrganizationJsonLd />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_300px] gap-3 md:gap-4 lg:gap-6">

        {/* 左侧边栏 */}
        <aside className="-order-1 hidden md:block">
          <div className="flex flex-col gap-4 w-full sticky top-16">

            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/10">
              <div className="h-full rounded-[15px] bg-white p-5 transition-colors dark:bg-slate-900">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-3xl">{siteConfig.author.avatarEmoji}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center mt-3 gap-0.5">
                    <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{siteConfig.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{siteConfig.author.tagline}</span>
                  </div>
                  <div className="flex flex-row gap-0 justify-center w-full mt-4 divide-x divide-gray-100 dark:divide-slate-700 border-t border-gray-100 dark:border-slate-700 pt-4">
                    <div className="flex flex-col gap-0.5 items-center flex-1">
                      <span className="text-base font-bold text-gray-900 dark:text-white">{totalPosts}</span>
                      <span className="text-xs text-gray-400">{t('stats.posts')}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-center flex-1">
                      <span className="text-base font-bold text-gray-900 dark:text-white">{totalCategories}</span>
                      <span className="text-xs text-gray-400">{t('stats.categories')}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 items-center flex-1">
                      <span className="text-base font-bold text-gray-900 dark:text-white">{totalTags}</span>
                      <span className="text-xs text-gray-400">{t('stats.tags')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="px-4 pt-4 pb-1">
                <Link href="/" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
                  {t('sections.categories')}
                </Link>
              </div>
              <div className="flex flex-col gap-1 px-3 pb-3 pt-1">
                <Link
                  href="/"
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    !categoryId && !tagId
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 dark:from-blue-950/50 dark:to-indigo-950/40 dark:text-blue-300 dark:border-blue-900/60'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="flex-grow truncate">{t('allPosts')}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-300 tabular-nums bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-700">{totalPosts}</span>
                </Link>
                {categories.map((cat) => (
                  <CategoryLink key={cat.id} cat={cat} categoryId={categoryId} />
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="px-4 pt-4 pb-1">
                <Link href="/" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">{t('sections.tags')}</Link>
              </div>
              <div className="px-3 pb-4 pt-2 flex flex-row flex-wrap gap-2">
                {visibleTags.length === 0 ? (
                  <span className="text-xs text-gray-400 px-1 py-2">{t('noTags')}</span>
                ) : visibleTags.map(tag => (
                  <Link
                    key={tag.id}
                    href={{ pathname: '/', query: { tagId: tag.id } }}
                    className={`inline-flex items-center justify-center h-7 rounded-full px-3 text-xs font-bold shadow-sm hover:shadow-md transition-all ${
                      tagId === tag.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-purple-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:from-slate-700 dark:hover:to-slate-700 dark:hover:text-purple-300'
                    }`}
                  >
                    #{tag.name}
                    <span className={`ml-1.5 text-[10px] ${tagId === tag.id ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                      {tag._count.posts}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="px-4 pt-4 pb-1">
                <PlainLink href={`/${locale}/archives`} className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
                  {t('sections.archives')}
                </PlainLink>
              </div>
              <div className="flex flex-col gap-1 px-3 pb-3 pt-1">
                {archiveYears.length === 0 ? (
                  <span className="text-xs text-gray-400 px-1 py-2">{t('noArchives')}</span>
                ) : archiveYears.map(([year, count]) => (
                  <PlainLink
                    key={year}
                    href={`/${locale}/archives#year-${year}`}
                    className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
                  >
                    <span className="flex-grow truncate">{year}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-300 tabular-nums bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-700">
                      {count}
                    </span>
                  </PlainLink>
                ))}
              </div>
            </div>

            <PlainLink
              href="/admin"
              className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 overflow-hidden p-4 block transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform">
                  ⚙️
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{t('adminTitle')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminSubtitle')}</p>
                </div>
              </div>
            </PlainLink>
          </div>
        </aside>

        {/* 中间文章列表 */}
        <div className="w-full flex flex-col items-center gap-8">
          {databaseUnavailable && (
            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {t('databaseUnavailable')}
            </div>
          )}
          <div className="w-full flex flex-col gap-4">
            {posts.length === 0 && !databaseUnavailable ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400">
                {t('noPosts')}
              </div>
            ) : posts.map((post, index) => {
              const postHref = `/${locale}/posts/${post.slug || post.id}`;
              return (
              <PlainLink
                key={post.id}
                href={postHref}
                className="group w-full"
              >
                <div className="relative rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
                  <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 group-hover:border-purple-100 group-hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:group-hover:border-purple-800">
                    <div className="flex flex-row items-center gap-3 mb-3 flex-wrap">
                      {post.category && (
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm text-white"
                          style={{ backgroundColor: post.category.color }}
                        >
                          {post.category.name}
                        </span>
                      )}
                      {post.isPinned && (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                          {t('pinned')}
                        </span>
                      )}
                      {isAdmin && !post.isPublic && (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700">
                          {t('private')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-medium">{new Date(post.createdAt).toLocaleDateString(dateLocale)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                      <span className="text-xs text-gray-400 font-medium">{t('minRead', { minutes: Math.max(1, Math.ceil(post.content.length / 300)) })}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                      <span className="text-xs text-gray-400 font-medium">👁️ {post.viewCount}</span>
                      {post.likeCount > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                          <span className="text-xs text-gray-400 font-medium">❤️ {post.likeCount}</span>
                        </>
                      )}
                    </div>
                    {post.coverImage && (
                      <LazyImage
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        priority={index === 0}
                        className="mb-5 aspect-[16/7] rounded-xl border border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-800"
                        imageClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 760px"
                      />
                    )}
                    <h3 className="text-xl md:text-2xl font-bold mb-3 leading-snug group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300 text-gray-900 dark:text-white">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                      <div className="flex gap-2">
                        {post.category && (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: post.category.color }}
                          >
                            #{post.category.slug}
                          </span>
                        )}
                        {post.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag.id}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300 flex items-center gap-1">
                        {t('readMore')}
                      </span>
                    </div>
                  </div>
                </div>
              </PlainLink>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center mx-auto w-full">
              <ul className="flex flex-row items-center gap-2">
                <li>
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageHref(currentPage - 1)}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm bg-gray-100 text-gray-600 font-medium hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all duration-300"
                    >
                      {t('previous')}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm opacity-50 pointer-events-none bg-gray-100 text-gray-400 font-medium">
                      {t('previous')}
                    </span>
                  )}
                </li>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <li key={pageNum} className="hidden sm:block">
                      <Link
                        href={buildPageHref(pageNum)}
                        className={`inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-medium transition-all duration-300 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageHref(currentPage + 1)}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all duration-300"
                    >
                      {t('next')}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm opacity-50 pointer-events-none bg-gray-100 dark:bg-slate-800 text-gray-400 font-medium">
                      {t('next')}
                    </span>
                  )}
                </li>
              </ul>
            </nav>
          )}
        </div>

        {/* 右侧边栏 */}
        <aside className="order-1 hidden lg:block">
          <div className="flex flex-col gap-4 w-full sticky top-16">

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('sections.recentArticles')}</h3>
              </div>
              <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
                {posts.slice(0, 5).map((post, index) => (
                  <PlainLink
                    key={post.id}
                    href={`/${locale}/posts/${post.slug || post.id}`}
                    className="group flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all duration-300"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors text-gray-900 dark:text-white line-clamp-2">
                        {post.title}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString(dateLocale)}</span>
                    </div>
                  </PlainLink>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">{t('sections.recentComments')}</h3>
              </div>
              <div className="px-4 pb-4 pt-3">
                {recentComments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">{t('noComments')}</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {recentComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{t('commentedOn', { author: comment.author })}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={comment.content}>{comment.content}</span>
                          <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString(dateLocale)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {friendLinks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">{t('sections.friends')}</h3>
                </div>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {friendLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:from-purple-50 hover:to-purple-100 dark:hover:from-slate-700 dark:hover:to-slate-700 transition-all"
                        title={link.description || undefined}
                      >
                        <span className="relative w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] shrink-0 overflow-hidden">
                          {link.avatar ? (
                            <Image
                              src={link.avatar}
                              alt=""
                              fill
                              sizes="16px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            '🔗'
                          )}
                        </span>
                        <span className="max-w-[80px] truncate">{link.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
