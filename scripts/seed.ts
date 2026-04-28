import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/lib/slug';

const prisma = new PrismaClient();

const posts = [
  {
    title: '我的博客开张了！',
    slug: slugify('我的博客开张了'),
    excerpt: '欢迎来到我的个人博客，这里将记录我的日常生活和工作心得。',
    content: `# 我的博客开张了！

欢迎来到我的个人博客！🎉

## 关于这个博客

这个博客将主要记录两方面的内容：
- **日常生活**：我的生活点滴、旅行经历、美食分享
- **工作心得**：技术学习、项目经验、职业思考

## 为什么要写博客

1. **记录成长**：文字是最好的记忆方式
2. **分享交流**：希望能和更多志同道合的朋友交流
3. **输出倒逼输入**：写作能让我更深入地思考

感谢你的访问，欢迎在下方留言交流！`,
    categorySlug: 'daily',
    coverImage: 'https://picsum.photos/seed/blog1/800/400',
  },
  {
    title: 'Next.js 14 开发体验分享',
    slug: slugify('Next.js 14 开发体验分享'),
    excerpt: '最近用 Next.js 14 重构了项目，聊聊新特性和开发体验。',
    content: `# Next.js 14 开发体验分享

最近将项目升级到了 Next.js 14，整体体验非常不错。

## App Router 的优势

- **更直观的路由组织**：文件夹即路由
- **Server Components**：减少客户端 JS 体积
- **Streaming SSR**：更好的首屏加载体验

## Server Actions

Next.js 14 稳定了 Server Actions，让前后端数据交互变得极其简单：

\`\`\`typescript
async function submitForm(formData: FormData) {
  'use server'
  // 服务端逻辑
}
\`\`\`

## 总结

Next.js 越来越成熟，推荐大家尝试！`,
    categorySlug: 'tech',
    coverImage: 'https://picsum.photos/seed/nextjs/800/400',
  },
  {
    title: '周末的咖啡时光',
    slug: slugify('周末的咖啡时光'),
    excerpt: '周末在家附近的咖啡馆度过了一个悠闲的下午。',
    content: `# 周末的咖啡时光 ☕

周末不需要赶时间，找一家安静的咖啡馆，点一杯拿铁，读一本好书。

## 今日书单

《被讨厌的勇气》- 阿德勒心理学

> 决定我们自身的不是过去的经历，而是我们自己赋予经历的意义。

## 小确幸

- 阳光正好，洒在桌面上
- 咖啡师拉花特别好看
- 邻座小姐姐分享了她的曲奇

生活的美好就藏在这些平凡的瞬间里。`,
    categorySlug: 'daily',
    coverImage: 'https://picsum.photos/seed/coffee/800/400',
  },
  {
    title: 'TypeScript 高级类型技巧',
    slug: slugify('TypeScript 高级类型技巧'),
    excerpt: '分享几个工作中常用的 TypeScript 高级类型技巧。',
    content: `# TypeScript 高级类型技巧

今天分享几个工作中常用的 TypeScript 技巧。

## 1. 条件类型

\`\`\`typescript
type IsString<T> = T extends string ? true : false
\`\`\`

## 2. 映射类型

\`\`\`typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}
\`\`\`

## 3. infer 关键字

\`\`\`typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
\`\`\`

掌握这些技巧能让你的类型更加精确！`,
    categorySlug: 'tech',
    coverImage: 'https://picsum.photos/seed/typescript/800/400',
  },
];

async function main() {
  console.log('开始初始化数据...');

  // 清空现有数据
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: '日常',
        slug: 'daily',
        description: '生活记录、随笔和日常分享',
        color: '#10b981',
        order: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: '技术',
        slug: 'tech',
        description: '技术心得、项目经验和开发笔记',
        color: '#3b82f6',
        order: 2,
      },
    }),
  ]);

  const categoryBySlug = new Map(categories.map(category => [category.slug, category]));

  // 创建文章
  for (const post of posts) {
    const { categorySlug, ...postData } = post;
    const category = categoryBySlug.get(categorySlug);

    await prisma.post.create({
      data: {
        ...postData,
        categoryId: category?.id,
      },
    });
  }

  console.log(`✅ 成功创建 ${posts.length} 篇文章`);

  // 添加示例评论
  const firstPost = await prisma.post.findFirst();
  if (firstPost) {
    await prisma.comment.createMany({
      data: [
        {
          postId: firstPost.id,
          author: '小明',
          content: '恭喜博客开张！期待更多精彩内容！',
        },
        {
          postId: firstPost.id,
          author: '技术爱好者',
          content: '加油！关注了！',
        },
      ],
    });
    console.log('✅ 成功创建示例评论');
  }

  console.log('🎉 数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
