import PostCardSkeleton from '@/components/PostCardSkeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:gap-6">
        <aside className="hidden md:block">
          <div className="sticky top-16 space-y-4">
            <div className="h-64 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 h-20 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-slate-800" />
              <div className="mx-auto mb-2 h-5 w-32 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              <div className="mx-auto h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
            </div>
            <div className="h-80 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="h-9 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <PostCardSkeleton count={5} />
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-16 space-y-4">
            <div className="h-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-6 w-6 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
