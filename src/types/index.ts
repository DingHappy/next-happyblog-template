// 博客系统通用类型定义

// 文章相关类型
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string | null;
  coverImage: string | null;
  published: boolean;
  isPublic: boolean;
  scheduledAt: Date | null;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostWithRelations extends Post {
  category: Category | null;
  tags: Tag[];
  _count: {
    comments: number;
  };
}

// 分类相关类型
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  postCount: number;
  order: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

// 标签相关类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// 评论相关类型
export interface Comment {
  id: string;
  postId: string;
  author: string;
  email: string | null;
  content: string;
  approved: boolean;
  createdAt: Date;
  date?: string; // 向后兼容字段
}

export interface CommentWithPost extends Comment {
  post: {
    id: string;
    title: string;
  };
}

// 媒体相关类型
export interface Media {
  id: string;
  filename: string;
  url: string;
  size: number;
  createdAt: Date;
}

// 设置相关类型
export interface Setting {
  id: string;
  key: string;
  value: string | null;
  type: 'string' | 'number' | 'boolean' | 'json';
  createdAt: Date;
  updatedAt: Date;
}

// 站点配置类型
export interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  authorName: string;
  authorBio: string;
  authorAvatar: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    email?: string;
  };
  seo: {
    keywords: string[];
    ogImage?: string;
  };
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

// 分页参数类型
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 搜索参数类型
export interface SearchParams {
  query: string;
  categoryId?: string;
  tagId?: string;
  page?: number;
}
