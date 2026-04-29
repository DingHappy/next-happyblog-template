import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import prisma from '@/lib/prisma';
import CommentSection from '@/components/CommentSection';
import TableOfContents from '@/components/TableOfContents';
import PostMeta from '@/components/PostMeta';
import LikeButton from '@/components/LikeButton';
import ReadingProgress from '@/components/ReadingProgress';
import ShareButtons from '@/components/ShareButtons';
import { ArticleJsonLd, BreadcrumbItem } from '@/components/JsonLd';
import Breadcrumb from '@/components/Breadcrumb';
import { extractHeadings } from '@/lib/markdown';
import { requireAuth } from '@/lib/auth';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

const syntaxTheme = oneDark as Record<string, CSSProperties>;

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const inline = !match;
    return !inline ? (
      <div className="my-6 rounded-xl overflow-hidden shadow-lg p-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        <div className="rounded-[10px] overflow-hidden">
          <SyntaxHighlighter
            style={syntaxTheme}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0 }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      </div>
    ) : (
      <code className="bg-gradient-to-r from-pink-50 to-purple-50 px-2 py-1 rounded-lg text-sm text-pink-600 font-mono border border-pink-100" {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children, id }) => <h1 id={id} className="scroll-mt-20 text-2xl font-bold mt-10 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{children}</h1>,
  h2: ({ children, id }) => <h2 id={id} className="scroll-mt-20 text-xl font-bold mt-8 mb-3 text-gray-800 pb-2 border-b-2 border-gradient-to-r from-blue-200 to-purple-200">{children}</h2>,
  h3: ({ children, id }) => <h3 id={id} className="scroll-mt-20 text-lg font-bold mt-6 mb-2 text-gray-800">{children}</h3>,
  p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-4 text-base">{children}</p>,
  ul: ({ children }) => <ul className="list-none my-6 space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-6 space-y-2">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700 pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-purple-500 before:font-bold">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gradient-to-b from-blue-500 to-purple-500 pl-6 py-4 my-8 bg-gradient-to-r from-blue-50 via-purple-50 to-transparent rounded-r-2xl shadow-inner">
      <div className="text-gray-700 text-lg italic leading-relaxed">{children}</div>
    </blockquote>
  ),
};

function normalizePostParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function getPostByIdOrSlug(idOrSlug: string, isAdmin: boolean) {
  return prisma.post.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { slug: idOrSlug },
      ],
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
    },
    include: {
      category: true,
      tags: true,
      comments: {
        where: { approved: true },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

// 获取相关文章：优先同分类，其次同标签
async function getRelatedPosts(postId: string, categoryId: string | null, tagIds: string[], isAdmin: boolean) {
  // 同分类的文章（排除自己）
  const sameCategory = categoryId ? await prisma.post.findMany({
    where: {
      id: { not: postId },
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
      categoryId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      createdAt: true,
      category: {
        select: {
          name: true,
          color: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  }) : [];

  if (sameCategory.length >= 4) {
    return sameCategory;
  }

  // 同标签的文章（排除已经选的和自己）
  const excludeIds = [postId, ...sameCategory.map(p => p.id)];
  const sameTag = await prisma.post.findMany({
    where: {
      id: { notIn: excludeIds },
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
      tags: {
        some: {
          id: { in: tagIds },
        },
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      createdAt: true,
      category: {
        select: {
          name: true,
          color: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 4 - sameCategory.length,
  });

  return [...sameCategory, ...sameTag];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = normalizePostParam(rawId);
  const isAdmin = await requireAuth();
  const post = await prisma.post.findFirst({
    where: {
      OR: [
        { id },
        { slug: id },
      ],
      published: true,
      ...(isAdmin ? {} : { isPublic: true }),
    },
    include: {
      category: true,
      tags: true,
    },
  });

  if (!post) {
    return {
      title: `文章不存在 - ${siteConfig.name}`,
    };
  }

  const postUrl = `/posts/${post.slug || post.id}`;

  return {
    title: `${post.title} - ${siteConfig.name}`,
    description: post.excerpt,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl,
      type: 'article',
      images: post.coverImage ? [post.coverImage] : undefined,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      section: post.category?.name,
      tags: post.tags.map(t => t.name),
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = normalizePostParam(rawId);
  const isAdmin = await requireAuth();

  // 从数据库读取文章，只显示已审核的评论 - 管理员可以看到不公开的文章
  const post = await getPostByIdOrSlug(id, isAdmin);

  // 获取相关文章
  const relatedPosts = post ? await getRelatedPosts(
    post.id,
    post.categoryId,
    post.tags.map(t => t.id),
    isAdmin
  ) : [];

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">文章不存在</h1>
        <p className="text-gray-500 mb-8">这篇文章可能已经被删除或不存在</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
          ← 返回首页
        </Link>
      </div>
    );
  }

  const headings = extractHeadings(post.content);
  const readingMinutes = Math.max(1, Math.ceil(post.content.length / 300));

  return (
    <>
      {/* SEO Structured Data */}
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        url={`/posts/${post.slug || post.id}`}
        authorName={siteConfig.author.name}
        datePublished={post.createdAt.toISOString()}
        dateModified={post.updatedAt.toISOString()}
        image={post.coverImage || undefined}
        tags={post.tags.map(t => t.name)}
        category={post.category?.name}
      />
      <ReadingProgress />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_300px] gap-3 md:gap-4 lg:gap-6">
        
        {/* 左侧边栏 - 目录 */}
        <aside className="-order-1 hidden md:block">
          <div className="flex flex-col gap-4 w-full sticky top-16">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">On this page</h3>
              <TableOfContents headings={headings} />
            </div>
          </div>
        </aside>

        {/* 中间内容 */}
        <article className="max-w-none">
          <Breadcrumb
            items={[
              { label: '首页', href: '/' },
              ...(post.category ? [{ label: post.category.name, href: `/?categoryId=${post.category.id}` }] as BreadcrumbItem[] : []),
              { label: post.title, href: `/posts/${post.slug || post.id}` },
            ]}
          />

           <header className="mb-8">
              <div className="flex flex-row items-center gap-3 mb-4 flex-wrap">
               {post.category && (
                 <span 
                   className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold shadow-md text-white"
                   style={{ backgroundColor: post.category.color }}
                 >
                   {post.category.name}
                 </span>
               )}
               {isAdmin && !post.isPublic && (
                 <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold bg-yellow-100 text-yellow-700">
                   🔒 不公开文章
                 </span>
               )}
               <time className="text-sm text-gray-400 font-medium">{new Date(post.createdAt).toLocaleDateString('zh-CN')}</time>
               <span className="w-1 h-1 rounded-full bg-gray-200"></span>
               <span className="text-sm text-gray-400 font-medium">约 {readingMinutes} 分钟阅读</span>
               <span className="w-1 h-1 rounded-full bg-gray-200"></span>
               <PostMeta
                 postId={post.id}
                 initialViewCount={post.viewCount}
                 initialLikeCount={post.likeCount}
               />
             </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">
              {post.title}
            </h1>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag.id}
                    href={`/?tagId=${tag.id}`}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-purple-700 transition-all"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {post.coverImage && (
            <div className="mb-10 rounded-2xl overflow-hidden shadow-2xl p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
	              <div className="relative h-64 overflow-hidden rounded-[15px] md:h-80">
	                <Image
	                  src={post.coverImage}
	                  alt={post.title}
	                  fill
	                  sizes="(max-width: 768px) 100vw, 960px"
	                  priority
	                  unoptimized
	                  className="object-cover"
	                />
	              </div>
	            </div>
	          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={markdownComponents}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <LikeButton postId={post.id} initialCount={post.likeCount} />
          </div>

          {/* 相关文章推荐 */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-purple-600">✨</span> 相关文章
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/posts/${related.slug || related.id}`}
                    className="group block"
                  >
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all duration-300">
                      {related.category && (
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium text-white mb-3"
                          style={{ backgroundColor: related.category.color }}
                        >
                          {related.category.name}
                        </span>
                      )}
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{related.excerpt}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-3">
                        {new Date(related.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <CommentSection postId={post.id} initialComments={post.comments} />
        </article>

        {/* 右侧边栏 */}
        <aside className="order-1 hidden lg:block">
          <div className="flex flex-col gap-4 w-full sticky top-16">
            {/* 作者卡片 */}
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/10">
              <div className="bg-white dark:bg-slate-800 rounded-[15px] p-5 h-full">
                <div className="px-0 pt-0 pb-2 border-b border-gray-50 dark:border-slate-700 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Author</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/20">
                    {siteConfig.author.avatarEmoji}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{siteConfig.author.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{siteConfig.author.bio}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 分享卡片 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              <div className="px-0 pt-0 pb-2 border-b border-gray-50 dark:border-slate-700 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Share</h3>
              </div>
              <ShareButtons title={post.title} url={`/posts/${post.slug || post.id}`} />
            </div>
          </div>
         </aside>
       </div>
     </div>
    </>
   );
 }
