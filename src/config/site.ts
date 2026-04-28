export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Next Blog Template',
  title: process.env.NEXT_PUBLIC_SITE_TITLE || 'Next Blog Template - Write and publish with ease',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'A full-stack personal blog template with posts, comments, admin workflows, knowledge sync, and deployment tooling.',
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    'http://localhost:3000',
  locale: 'zh_CN',
  language: 'zh-CN',
  logoEmoji: process.env.NEXT_PUBLIC_SITE_LOGO_EMOJI || '✨',
  author: {
    name: process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Template Author',
    bio:
      process.env.NEXT_PUBLIC_AUTHOR_BIO ||
      'Use environment variables, admin settings, or a private production branch to personalize this template.',
    avatarEmoji: process.env.NEXT_PUBLIC_AUTHOR_AVATAR_EMOJI || '👨‍💻',
    tagline: process.env.NEXT_PUBLIC_AUTHOR_TAGLINE || 'Technology & Life',
  },
  nav: [
    { href: '/', label: '首页' },
    { href: '/archives', label: '归档' },
    { href: '/about', label: '关于' },
  ],
  about: {
    headline: '关于这个模板',
    subtitle: '一个可公开维护、可私有部署的个人博客模板',
    introTitle: '你好，这里是模板介绍',
    paragraphs: [
      '这是一个基于 Next.js、Prisma 和 PostgreSQL 的全栈博客模板，适合用作公开模板仓库，也适合作为私有生产站点的上游代码源。',
      '你可以在公开模板仓库继续开发通用功能，在私有生产仓库里维护真实内容、生产环境变量、上传文件和备份数据。',
      '建议把 About 内容、站点名称、作者信息和社交链接放在私有仓库、环境变量或后台设置中覆盖，避免把个人信息提交到公开模板。',
    ],
    featureCards: [
      {
        icon: '📝',
        title: '内容管理',
        description: '文章、分类、标签、评论、媒体和 Markdown 写作体验。',
        color: 'emerald',
      },
      {
        icon: '🛠️',
        title: '运维能力',
        description: '用户权限、审计日志、备份恢复、健康检查和 Docker 部署。',
        color: 'blue',
      },
    ],
    techStack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Docker'],
    interests: [
      { emoji: '📚', label: '写作', desc: '沉淀内容' },
      { emoji: '💻', label: '开发', desc: '持续迭代' },
      { emoji: '🔐', label: '私有化', desc: '保护生产数据' },
      { emoji: '🚀', label: '部署', desc: '可上线运行' },
    ],
  },
  socialLinks: {
    email: process.env.NEXT_PUBLIC_SOCIAL_EMAIL || '',
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '',
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '',
  },
};

export type SiteConfig = typeof siteConfig;
