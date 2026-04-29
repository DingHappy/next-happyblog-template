interface PostCardSkeletonProps {
  count?: number;
}

export default function PostCardSkeleton({ count = 5 }: PostCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative rounded-2xl overflow-hidden bg-white p-6 shadow-sm border border-gray-100"
        >
          {/* 元信息骨架 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="h-6 w-16 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-4 w-24 rounded-full bg-gray-100 animate-pulse" />
          </div>

          {/* 标题骨架 */}
          <div className="h-7 md:h-8 w-3/4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg mb-3 animate-pulse" />
          <div className="h-7 md:h-8 w-1/2 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg mb-4 animate-pulse" />

          {/* 摘要骨架 */}
          <div className="space-y-2 mb-5">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-10/12 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* 底部骨架 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-6 w-12 rounded-full bg-gray-100 animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}
