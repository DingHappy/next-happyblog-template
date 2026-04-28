# 部署

## 1. 环境变量

复制 `.env.example` 为 `.env`，按注释填好。**上线前必须**设置 `ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_HASH`，否则生产环境会拒绝启动。

如果不想把明文密码写进 env，可以改用 `ADMIN_PASSWORD_HASH`：

```bash
echo -n "your-password" | shasum -a 256 | awk '{print $1}'
```

## 2. 数据库迁移

任何环境，部署前都要把 schema 同步好：

```bash
npx prisma migrate deploy
```

Dockerfile 的 `CMD` 已经把这一步包进了启动命令，容器启动时会自动跑。

## 3. 本地用 Docker 跑生产构建

```bash
# 一次性把 app + postgres 起起来（端口 3000）
docker compose -f docker-compose.prod.yml up --build
```

`docker-compose.prod.yml` 会读取 `.env` 里的：

- `ADMIN_PASSWORD`（必填，否则启动会失败）
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`（默认 `blog_user` / `blog_password` / `blog_db`）
- `KNOWLEDGE_BASE_PATH` / `EXPORT_KNOWLEDGE_PATH`（默认 `/knowledge`，需要在 compose 里挂卷）
- `PORT`（默认 3000）

要用知识库同步功能，把 `app.volumes` 里那行注释打开，指向你本机的 docs 目录。

## 4. 部署到 VPS / 云

最低要求：Postgres 16、Node 20、可写的 `public/uploads/` 目录。

两种思路：

### 方案 A：直接跑 docker-compose.prod.yml

把仓库 + `.env` 拷到服务器，`docker compose -f docker-compose.prod.yml up -d --build`。前面再挂 nginx / Caddy 反代到 3000 端口加 HTTPS。

### 方案 B：仅打镜像，外挂 Postgres

`docker build -t my-blog .`，跑容器时传 `DATABASE_URL` 指向托管的 Postgres，把 `public/uploads/` 挂载到持久卷。

## 5. 上线前检查清单

- [ ] `.env` 里 `ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_HASH` 已设置
- [ ] `npx prisma migrate deploy` 已执行（容器启动会自动跑）
- [ ] `public/uploads/` 已挂卷或备份策略
- [ ] HTTPS 已就位（admin cookie 在生产模式下带 `secure` 标）
- [ ] 反代信任真实 IP（评论速率限制依赖 `x-forwarded-for`）
- [ ] 数据库定期备份

## 6. 已知限制

- 评论速率限制是进程内 Map，多实例部署会被绕开。如要扩容，需要把 `recentByIp` 换成 Redis 或类似共享存储。
- 知识库路径是单机文件系统路径，不支持远程仓库 / S3。同步功能仅在源路径可见的实例上生效。
