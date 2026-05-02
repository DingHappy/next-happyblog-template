interface PostCardSkeletonProps {
  count?: number;
}

export default function PostCardSkeleton({ count = 5 }: PostCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {/* 元信息骨架 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="h-6 w-16 animate-pulse rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700" />
            <div className="h-4 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
          </div>

          <div className="mb-5 aspect-[16/7] animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />

          {/* 标题骨架 */}
          <div className="mb-3 h-7 w-3/4 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 md:h-8" />
          <div className="mb-4 h-7 w-1/2 animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 md:h-8" />

          {/* 摘要骨架 */}
          <div className="space-y-2 mb-5">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
          </div>

          {/* 底部骨架 */}
          <div className="flex items-center justify-between border-t border-gray-50 pt-4 dark:border-slate-800">
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
              <div className="h-6 w-12 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </>
  );
}
