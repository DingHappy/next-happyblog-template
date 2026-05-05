import Link from 'next/link';
import { Suspense } from 'react';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { canManageAnyPost } from '@/lib/permissions';
import AdminSidebar from '@/components/AdminSidebar';
import AdminPostsTable from '@/components/AdminPostsTable';
import type { AdminPostFilters } from '@/components/AdminPostsTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type AdminPostsSearchParams = {
  q?: string;
  status?: string;
  categoryId?: string;
  tagId?: string;
  sort?: string;
  pageSize?: string;
  page?: string;
};

const statusFilters = new Set([
  'all',
  'published',
  'draft',
  'scheduled',
  'pending',
  'rejected',
  'public',
  'private',
  'pinned',
]);
const sortOptions = new Set([
  'createdAt-desc',
  'createdAt-asc',
  'updatedAt-desc',
  'updatedAt-asc',
  'viewCount-desc',
  'viewCount-asc',
  'commentsCount-desc',
  'commentsCount-asc',
  'title-asc',
  'title-desc',
]);

function parseFilters(searchParams: AdminPostsSearchParams): AdminPostFilters {
  const status = statusFilters.has(searchParams.status || '') ? searchParams.status : 'all';
  const sort = sortOptions.has(searchParams.sort || '') ? searchParams.sort : 'createdAt-desc';
  const page = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1);
  const requestedPageSize = Number.parseInt(searchParams.pageSize || String(PAGE_SIZE), 10);
  const pageSize = [20, 50, 100].includes(requestedPageSize) ? requestedPageSize : PAGE_SIZE;

  return {
    query: (searchParams.q || '').trim(),
    status: status as AdminPostFilters['status'],
    categoryId: searchParams.categoryId || '',
    tagId: searchParams.tagId || '',
    sort: sort as AdminPostFilters['sort'],
    pageSize,
    page,
  };
}

function buildPostWhere(filters: AdminPostFilters): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {};

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { slug: { contains: filters.query, mode: 'insensitive' } },
      { excerpt: { contains: filters.query, mode: 'insensitive' } },
      { category: { name: { contains: filters.query, mode: 'insensitive' } } },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.tagId) {
    where.tags = {
      some: { id: filters.tagId },
    };
  }

  if (filters.status === 'published') {
    where.published = true;
  } else if (filters.status === 'draft') {
    where.published = false;
    where.scheduledAt = null;
    where.status = 'draft';
  } else if (filters.status === 'scheduled') {
    where.published = false;
    where.scheduledAt = { not: null };
  } else if (filters.status === 'pending') {
    where.status = 'pending';
  } else if (filters.status === 'rejected') {
    where.status = 'rejected';
  } else if (filters.status === 'public') {
    where.isPublic = true;
  } else if (filters.status === 'private') {
    where.isPublic = false;
  } else if (filters.status === 'pinned') {
    where.isPinned = true;
  }

  return where;
}

function buildPostOrderBy(sort: AdminPostFilters['sort']): Prisma.PostOrderByWithRelationInput {
  switch (sort) {
    case 'createdAt-asc':
      return { createdAt: 'asc' };
    case 'updatedAt-desc':
      return { updatedAt: 'desc' };
    case 'updatedAt-asc':
      return { updatedAt: 'asc' };
    case 'viewCount-desc':
      return { viewCount: 'desc' };
    case 'viewCount-asc':
      return { viewCount: 'asc' };
    case 'commentsCount-desc':
      return { comments: { _count: 'desc' } };
    case 'commentsCount-asc':
      return { comments: { _count: 'asc' } };
    case 'title-asc':
      return { title: 'asc' };
    case 'title-desc':
      return { title: 'desc' };
    case 'createdAt-desc':
    default:
      return { createdAt: 'desc' };
  }
}

export default async function AdminPosts({
  searchParams,
}: {
  searchParams: Promise<AdminPostsSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin');
  }

  const filters = parseFilters(await searchParams);
  const where = buildPostWhere(filters);
  if (!canManageAnyPost(user)) {
    where.authorId = user.id;
  }
  const orderBy = buildPostOrderBy(filters.sort);

  const [posts, filteredCount, totalPosts, categories, tags] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [
        orderBy,
        { createdAt: 'desc' },
      ],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        category: true,
        tags: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        author: {
          select: { id: true, username: true, displayName: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    }),
    prisma.post.count({ where }),
    prisma.post.count({
      where: canManageAnyPost(user) ? undefined : { authorId: user.id },
    }),
    prisma.category.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: [
        { posts: { _count: 'desc' } },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);

  const postRows = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    published: post.published,
    status: post.status,
    isPublic: post.isPublic,
    isPinned: post.isPinned,
    scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    viewCount: post.viewCount,
    author: post.author
      ? {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.displayName,
        }
      : null,
    category: post.category
      ? {
          id: post.category.id,
          name: post.category.name,
          color: post.category.color,
        }
      : null,
    tags: post.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
    commentsCount: post._count.comments,
  }));

  const categoryRows = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors flex">
      {/* 左侧边栏 */}
      <AdminSidebar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors">
          <div className="max-w-5xl mx-auto pl-14 pr-6 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ✨ 博客管理
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
                >
                  返回首页
                </Link>
                <Link
                  href="/admin/posts/new"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  + 新建文章
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          <Suspense fallback={
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          }>
            <AdminPostsTable
              posts={postRows}
              categories={categoryRows}
              tags={tags}
              filters={{ ...filters, page: currentPage }}
              pagination={{
                page: currentPage,
                pageSize: filters.pageSize,
                totalItems: filteredCount,
                totalPages,
              }}
              totalPosts={totalPosts}
              currentUser={{ id: user.id, role: user.role }}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
