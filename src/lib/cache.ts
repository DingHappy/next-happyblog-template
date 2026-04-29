// 简单的内存缓存，用于频繁读取的数据
const cache = new Map<string, { data: unknown; expires: number }>();

interface CacheOptions {
  ttl?: number; // 过期时间（毫秒），默认 5 分钟
}

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  const ttl = options.ttl ?? 5 * 60 * 1000;
  cache.set(key, {
    data,
    expires: Date.now() + ttl,
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached) return cached;

  const data = await fn();
  setCache(key, data, options);
  return data;
}

// 文章列表缓存
export const cacheKeys = {
  posts: 'posts:list',
  post: (id: string) => `post:${id}`,
  categories: 'categories:list',
  tags: 'tags:list',
  stats: 'stats:dashboard',
  comments: (postId: string) => `comments:${postId}`,
};
