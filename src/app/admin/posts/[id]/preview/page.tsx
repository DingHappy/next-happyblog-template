import Image from 'next/image';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export default async function PreviewPost({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    redirect('/admin');
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      category: true,
      tags: true,
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-4xl mx-auto pl-14 pr-4 py-3 md:px-4 flex items-center justify-between">
          <Link
            href={`/admin/posts/${post.id}/edit`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回编辑</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
              预览模式
            </span>
            {!post.published && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                未发布
              </span>
            )}
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8">
          {post.category && (
            <span
              className="inline-flex px-3 py-1 rounded-full text-xs font-bold mb-4 text-white"
              style={{ backgroundColor: post.category.color }}
            >
              {post.category.name}
            </span>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-gray-500 text-sm">
            {new Date(post.createdAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        {post.coverImage && (
          <div className="relative w-full h-80 rounded-2xl mb-8 shadow-lg overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {post.excerpt && (
          <div className="text-xl text-gray-600 mb-8 leading-relaxed border-l-4 border-purple-500 pl-4">
            {post.excerpt}
          </div>
        )}

        <div className="prose prose-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
