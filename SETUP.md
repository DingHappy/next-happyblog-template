# 🚀 博客功能完整设置指南

## 📋 已实现功能

✅ **搜索功能** - 支持全文搜索，快捷键 `⌘K`  
✅ **PostgreSQL 数据库** - Docker 一键启动  
✅ **评论持久化** - 评论存在数据库，刷新不丢失  
✅ **Prisma ORM** - 类型安全的数据库操作  

---

## 🔧 启动步骤

### 1️⃣ 启动 PostgreSQL 数据库

确保你已经安装了 Docker，然后运行：

```bash
npm run db:up
```

等待几秒钟，数据库启动完成。

### 2️⃣ 生成 Prisma Client

```bash
npm run prisma:generate
```

### 3️⃣ 创建数据库表

```bash
npm run db:migrate
```

这会创建 `Post`、`Comment`、`Tag` 三张表。

### 4️⃣ 初始化示例数据

```bash
npm run db:seed
```

这会把 4 篇示例文章和 2 条评论存入数据库。

### 5️⃣ 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可查看博客！

---

## 📦 常用命令

| 命令 | 说明 |
|------|------|
| `npm run db:up` | 启动 PostgreSQL 容器 |
| `npm run db:down` | 关闭数据库（保留数据） |
| `npm run db:studio` | 打开 Prisma Studio 可视化管理数据 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 重置并填充示例数据 |

---

## 🔍 搜索功能使用

### 两种方式打开搜索：

1. **点击导航栏的「搜索」按钮**
2. **使用快捷键 `⌘ + K`** (Mac) 或 `Ctrl + K` (Windows)

### 搜索特性：

- ✅ 实时搜索（输入即搜索，200ms 防抖）
- ✅ 搜索标题、摘要、文章内容
- ✅ 关键词高亮显示
- ✅ 键盘导航（↑↓ 选择，Enter 打开，Esc 关闭）
- ✅ 显示文章分类、发布日期、评论数

---

## 💾 数据结构

### Post 文章表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一 ID |
| title | String | 标题 |
| excerpt | String | 摘要 |
| content | String | Markdown 内容 |
| category | String | 分类 (daily/tech) |
| coverImage | String? | 封面图 |
| viewCount | Int | 阅读数 |
| likeCount | Int | 点赞数 |
| createdAt | DateTime | 创建时间 |

### Comment 评论表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一 ID |
| postId | String | 关联文章 ID |
| author | String | 评论者昵称 |
| email | String? | 邮箱（可选） |
| content | String | 评论内容 |
| approved | Boolean | 是否审核通过 |
| createdAt | DateTime | 评论时间 |

---

## 🛠️ 数据库管理

### 查看数据

```bash
npm run db:studio
```

这会打开一个 Web 界面，你可以：
- 查看所有文章和评论
- 编辑内容
- 添加新文章
- 执行 SQL 查询

### 重置数据

如果想清空数据重新初始化：

```bash
npm run db:seed
```

---

## 📝 后续扩展建议

1. **文章详情页查询数据库** - 现在还是用模拟数据，可以改为从 DB 查询
2. **文章列表分页** - 支持加载更多
3. **文章管理后台** - 简单的登录和文章发布
4. **评论审核** - 评论需要审核才能显示
5. **点赞功能** - 文章点赞

---

## ❓ 常见问题

**Q: Docker 启动失败？**  
A: 确保 Docker Desktop 正在运行，并且 5432 端口没有被占用。

**Q: 数据库连接失败？**  
A: 检查 `.env` 中的 `DATABASE_URL` 是否正确，确保 `npm run db:up` 已经执行。

**Q: 如何连接到数据库命令行？**  
A: `docker exec -it blog-postgres psql -U blog_user -d blog_db`
