.PHONY: help build up down restart logs backup restore psql clean prune init-db

# 颜色定义
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RED    := $(shell tput -Txterm setaf 1)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo ''
	@echo '${YELLOW}博客系统 Docker 部署脚本${RESET}'
	@echo ''
	@echo '使用方法: ${GREEN}make <目标>${RESET}'
	@echo ''
	@echo '可用目标:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${GREEN}%-20s${RESET} %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ============================================
# 核心命令
# ============================================

init: ## 初始化部署环境（首次运行）
	@echo '${YELLOW}正在初始化部署环境...${RESET}'
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo '${GREEN}✓ .env 文件已创建，请修改其中的配置${RESET}'; \
	fi
	@mkdir -p public/uploads backups
	@echo '${GREEN}✓ 目录结构已创建${RESET}'
	@echo ''
	@echo '${YELLOW}请执行以下步骤完成部署:${RESET}'
	@echo '1. 编辑 .env 文件，配置正确的环境变量'
	@echo '2. 运行 make build 构建镜像'
	@echo '3. 运行 make up 启动服务'

build: ## 构建 Docker 镜像
	@echo '${YELLOW}正在构建 Docker 镜像...${RESET}'
	docker-compose build --no-cache

aliyun-build: ## 构建阿里云部署镜像（宿主机 Nginx）
	@echo '${YELLOW}正在构建阿里云部署镜像...${RESET}'
	docker compose -f docker-compose.aliyun.yml build

aliyun-up: ## 启动阿里云部署服务（app + postgres）
	@echo '${YELLOW}正在启动阿里云部署服务...${RESET}'
	docker compose -f docker-compose.aliyun.yml up -d postgres app

aliyun-migrate: ## 运行阿里云部署数据库迁移
	@echo '${YELLOW}正在运行阿里云部署数据库迁移...${RESET}'
	docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate

aliyun-logs: ## 查看阿里云部署应用日志
	docker compose -f docker-compose.aliyun.yml logs -f app

up: ## 启动服务（后台运行）
	@echo '${YELLOW}正在启动服务...${RESET}'
	docker-compose up -d
	@echo ''
	@echo '${GREEN}✓ 服务已启动${RESET}'
	@echo '访问地址: http://localhost:${APP_PORT:-3000}'
	@echo '运行 make logs 查看日志'

up-full: ## 启动完整服务（包含 Nginx）
	@echo '${YELLOW}正在启动完整服务...${RESET}'
	docker-compose --profile full up -d
	@echo ''
	@echo '${GREEN}✓ 完整服务已启动${RESET}'

down: ## 停止并删除容器
	@echo '${YELLOW}正在停止服务...${RESET}'
	docker-compose down

stop: ## 停止服务（保留容器）
	@echo '${YELLOW}正在停止服务...${RESET}'
	docker-compose stop

restart: ## 重启服务
	@echo '${YELLOW}正在重启服务...${RESET}'
	docker-compose restart

# ============================================
# 日志相关
# ============================================

logs: ## 查看所有服务日志
	docker-compose logs -f

logs-app: ## 查看应用日志
	docker-compose logs -f app

logs-db: ## 查看数据库日志
	docker-compose logs -f postgres

logs-nginx: ## 查看 Nginx 日志
	docker-compose logs -f nginx

# ============================================
# 数据库相关
# ============================================

psql: ## 连接到 PostgreSQL 数据库
	docker-compose exec postgres psql -U ${DB_USER:-blog} -d ${DB_NAME:-blog_db}

db-backup: ## 数据库备份
	@echo '${YELLOW}正在备份数据库...${RESET}'
	./scripts/backup-db.sh

db-restore: ## 数据库恢复（需指定 BACKUP_FILE=文件名）
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo '${YELLOW}使用方法: make db-restore BACKUP_FILE=backups/blog_db_xxx.dump${RESET}'; \
		exit 1; \
	fi
	@echo '${YELLOW}正在恢复数据库...${RESET}'
	./scripts/restore-db.sh $(BACKUP_FILE)

db-migrate: ## 运行数据库迁移
	@echo '${YELLOW}正在运行数据库迁移...${RESET}'
	docker-compose exec app npx prisma migrate deploy

# ============================================
# 管理命令
# ============================================

status: ## 查看服务状态
	@echo '${YELLOW}服务状态:${RESET}'
	@docker-compose ps

shell: ## 进入应用容器 Shell
	docker-compose exec app sh

clean: ## 清理未使用的资源（小心使用）
	@echo '${YELLOW}正在清理未使用的 Docker 资源...${RESET}'
	docker system prune -f

prune: ## 深度清理（删除所有未使用的镜像、容器、卷）
	@echo '${YELLOW}正在深度清理 Docker 资源...${RESET}'
	@echo '${RED}此操作将删除所有未使用的镜像和卷！${RESET}'
	@read -p "确定继续? (y/N) " confirm; \
	if [ "$$confirm" = "y" ]; then \
		docker system prune -a -f --volumes; \
	fi

# ============================================
# 部署辅助
# ============================================

update: ## 更新部署（拉取代码 + 构建 + 重启）
	@echo '${YELLOW}正在更新部署...${RESET}'
	git pull
	docker-compose build app
	docker-compose up -d app
	@echo '${GREEN}✓ 更新完成${RESET}'

health: ## 健康检查
	@echo '${YELLOW}服务健康状态:${RESET}'
	@docker-compose ps | grep -E "(NAME|app|postgres|nginx)"

watchtower: ## 启动自动更新（Watchtower）
	@echo '${YELLOW}正在启动 Watchtower 自动更新...${RESET}'
	docker run -d \
		--name watchtower \
		--restart always \
		-v /var/run/docker.sock:/var/run/docker.sock \
		containrrr/watchtower \
		--schedule "0 0 4 * * *" \
		--cleanup \
		blog-app blog-postgres blog-nginx
