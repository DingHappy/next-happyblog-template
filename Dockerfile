FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

# Prisma engines require OpenSSL inside Alpine-based images.
RUN apk add --no-cache openssl

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制依赖清单和 Prisma schema，尽量稳定 Docker 缓存层
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# 安装依赖并生成 Prisma Client（使用国内镜像加速）
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --no-audit --no-fund && \
    npx prisma generate

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 生产构建
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ARG APP_VERSION=0.1.0
ARG BUILD_SHA=unknown

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_VERSION=$APP_VERSION
ENV BUILD_SHA=$BUILD_SHA

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server.js"]
