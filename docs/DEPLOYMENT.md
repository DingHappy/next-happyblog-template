# 博客系统部署与运维文档

## 📋 目录

1. [快速开始](#快速开始)
2. [环境配置](#环境配置)
3. [Docker 部署](#docker-部署)
4. [数据库管理](#数据库管理)
5. [备份与恢复](#备份与恢复)
6. [监控与日志](#监控与日志)
7. [性能优化](#性能优化)
8. [安全建议](#安全建议)
9. [故障排查](#故障排查)

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

### 一键启动

```bash
# 1. 克隆代码
git clone <repository-url>
cd my-blog

# 2. 初始化配置
make init

# 3. 编辑环境变量
vim .env

# 4. 构建并启动
make build
make up

# 5. 查看日志确认启动成功
make logs-app
```

服务启动后访问: http://localhost:3000

---

## ⚙️ 环境配置

### 必须配置项

```env
# 站点 URL（重要！影响图片、链接生成）
NEXT_PUBLIC_URL=https://your-domain.com

# 管理员密码
ADMIN_PASSWORD=your_strong_password

# 数据库连接
DATABASE_URL=postgresql://blog:your_password@postgres:5432/blog_db?schema=public
```

### 可选配置项

```env
# 邮件通知（评论通知用）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="博客通知 <noreply@example.com>"
ADMIN_EMAIL=admin@example.com
```

---

## 🐳 Docker 部署

### 常用命令

```bash
# 启动服务
make up

# 停止服务
make down

# 重启服务
make restart

# 查看服务状态
make status

# 查看日志
make logs          # 所有日志
make logs-app      # 应用日志
make logs-db       # 数据库日志

# 进入应用容器
make shell

# 健康检查
make health
```

### 生产部署（带 Nginx）

```bash
# 启动完整服务（包含 Nginx）
make up-full
```

### 自动更新

使用 Watchtower 自动更新容器：

```bash
make watchtower
```

每天凌晨 4 点自动检查并更新。

---

## 🗄️ 数据库管理

### 连接数据库

```bash
# 使用 psql 客户端
make psql
```

### 数据库迁移

```bash
# 运行 Prisma 迁移
make db-migrate
```

### 备份与恢复

```bash
# 数据库备份（保存到 backups/ 目录）
make db-backup

# 数据库恢复
make db-restore BACKUP_FILE=backups/backup_20240101_120000.sql
```

### 数据库优化

```bash
# 首次部署运行优化脚本
docker-compose exec -T postgres psql -U blog -d blog_db < docker/postgres/init/00-optimize-db.sql
```

---

## 💾 备份与恢复

### 自动化备份

添加到 crontab 实现每日自动备份：

```bash
# 编辑 crontab
crontab -e

# 添加（每天凌晨 2 点备份）
0 2 * * * cd /path/to/blog && make db-backup >> backups/backup.log 2>&1
```

### 备份保留策略

建议配置备份文件自动清理：

```bash
# 添加到 crontab，保留最近 30 天备份
0 3 * * * find /path/to/blog/backups -name "backup_*.sql" -mtime +30 -delete
```

### 文件备份

除了数据库，还需要备份以下文件：

```bash
# 上传文件
/path/to/blog/public/uploads/

# 配置文件
/path/to/blog/.env

# SSL 证书（如果使用）
/path/to/blog/docker/ssl/
```

---

## 📊 监控与日志

### 健康检查

应用内置健康检查端点：

```bash
curl http://localhost:3000/api/health
```

返回示例：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": {
    "name": "next-happyblog-template",
    "environment": "production",
    "version": "0.1.0",
    "commit": "unknown"
  },
  "uptime": {
    "seconds": 86400,
    "formatted": "1d 0h 0m 0s"
  },
  "database": {
    "status": "ok",
    "responseTimeMs": 1.2,
    "migrations": {
      "status": "ok",
      "count": 9,
      "latest": "20260429100000_add_analytics_sessions"
    }
  },
  "memory": { ... }
}
```

### 日志位置

```bash
# 应用日志
docker-compose logs app

# 数据库日志
docker-compose logs postgres

# Nginx 访问日志
docker-compose exec nginx cat /var/log/nginx/access.log

# Nginx 错误日志
docker-compose exec nginx cat /var/log/nginx/error.log
```

### 日志轮转

Docker 内置日志轮转配置（默认 10MB × 5 文件）。

---

## ⚡ 性能优化

### 数据库优化

已配置的优化：

1. **复合索引**：
   - `(published, isPublic, createdAt)` - 文章列表查询
   - `(published, isPublic, isPinned, createdAt)` - 置顶文章查询
   - `(approved, createdAt)` - 评论列表查询

2. **全文搜索索引**（GIN 索引）：
   - 文章标题、摘要、内容
   - 评论内容和作者

3. **自动清理调优**：
   - Post 表：10% 变更触发 vacuum
   - Comment 表：5% 变更触发 vacuum
   - PostView 表：2% 变更触发 vacuum

### Nginx 缓存

已配置的缓存策略：

- 静态文件（/_next/static/）：缓存 1 年
- 上传文件（/uploads/）：缓存 30 天
- API 限流：10 req/s（burst 20）

### 应用层优化

1. **Prisma 连接池**：
   ```env
   DATABASE_URL=...?pool_timeout=30&connect_timeout=30
   ```

2. **图片压缩**：
   - 上传图片自动压缩
   - 支持 WebP 格式

---

## 🔒 安全建议

### 1. 密码安全

- 使用强密码（至少 16 位，包含大小写、数字、特殊字符）
- 定期更换密码
- 不要在代码中硬编码密码

### 2. 网络安全

```bash
# 配置防火墙（UFW 示例）
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable

# 不要对外暴露数据库端口
# docker-compose.yml 中可注释掉 ports 段
```

### 3. HTTPS 配置

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com
```

### 4. 定期更新

```bash
# 自动更新系统包
apt-get update && apt-get upgrade -y

# 更新 Docker 镜像
docker-compose pull
docker-compose up -d
```

### 5. 备份加密

```bash
# 加密备份文件
gpg -c backup_xxx.sql

# 解密
gpg -d backup_xxx.sql.gpg > backup_xxx.sql
```

---

## 🔧 故障排查

### 应用无法启动

1. 检查端口是否被占用：
   ```bash
   lsof -i :3000
   ```

2. 查看应用日志：
   ```bash
   make logs-app
   ```

3. 检查数据库连接：
   ```bash
   docker-compose exec postgres pg_isready
   ```

### 数据库连接失败

1. 检查数据库容器状态：
   ```bash
   docker-compose ps postgres
   ```

2. 检查数据库日志：
   ```bash
   make logs-db
   ```

3. 验证 DATABASE_URL 格式：
   ```
   postgresql://user:password@host:port/dbname?schema=public
   ```

### 性能问题

1. 查看慢查询：
   ```sql
   SELECT 
     query, 
     calls, 
     total_time, 
     mean_time 
   FROM pg_stat_statements 
   ORDER BY total_time DESC 
   LIMIT 10;
   ```

2. 查看索引使用情况：
   ```sql
   SELECT 
     relname, 
     indexrelname, 
     idx_scan 
   FROM pg_stat_user_indexes 
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

### 磁盘空间不足

1. 清理 Docker 资源：
   ```bash
   make clean
   ```

2. 清理旧备份：
   ```bash
   find backups -name "backup_*.sql" -mtime +7 -delete
   ```

3. 清理日志：
   ```bash
   docker system prune -a --volumes -f
   ```

---

## 📈 扩展建议

### 高可用

- PostgreSQL 主从复制
- 应用多实例 + 负载均衡
- Redis 缓存层

### 监控告警

- Prometheus + Grafana 监控
- 邮件/短信告警
- 磁盘空间、内存、CPU 使用率监控

### CDN 加速

- 静态资源 CDN
- 图片 CDN 处理
- 全球加速节点

---

## 📞 支持

如遇问题请：

1. 查看本文档故障排查部分
2. 检查应用和数据库日志
3. 查看 GitHub Issues 中是否有类似问题
4. 提交 Issue 时请附上：
   - 环境信息（OS、Docker 版本）
   - 错误日志
   - 复现步骤

---

## 📝 更新日志

- v1.0 - 初始部署文档
  - Docker Compose 编排
  - 健康检查
  - 备份恢复
  - 数据库优化
