# Next HappyBlog Template

A full-stack personal blog template built with Next.js, React, Prisma, PostgreSQL, and Tailwind CSS.

It is intended for a public template repository plus a private production repository:

- Public template: reusable code, migrations, docs, Docker files, example env.
- Private production site: real environment variables, uploads, backups, private content, deployment overrides.

## Features

- Public blog pages: posts, tags, categories, archives, search, RSS, sitemap.
- Admin workflows: posts, Markdown editor, media, comments, tags, categories, friend links, settings.
- Publishing controls: public/private posts, pinned posts, scheduled publishing, batch operations.
- Operations: users, roles, audit logs, backup/restore, health check, Docker/Nginx deployment files.
- Knowledge sync: import/export Markdown content from a configurable private path.

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run admin:create
npm run dev
```

Open `http://localhost:3000`.

The default `.env.example` is for host-machine development. It connects Prisma and `npm run dev` to `localhost:5432`, while Docker exposes PostgreSQL from the `postgres` service.

Admin initialization reads these values from `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_local_password
ADMIN_EMAIL=admin@example.com
ADMIN_DISPLAY_NAME=管理员
```

You can also create or reset the admin explicitly:

```bash
ADMIN_PASSWORD='your_new_password' npm run admin:create
```

## Environment Files

Use the right example for the runtime:

```bash
# Local development: Next.js and Prisma run on your host machine.
cp .env.example .env
# Equivalent explicit local example:
cp .env.local.example .env

# Production/server Docker app: app container talks to postgres:5432.
cp .env.production.example .env
```

The important difference is the database host:

```text
Local npm run dev / npx prisma: localhost:5432
Docker app container: postgres:5432
```

## Template Customization

Generic public defaults live in:

```text
src/config/site.ts
```

Use `NEXT_PUBLIC_*` variables or private production commits to customize site name, author information, About page content, and social links.

See [docs/TEMPLATE_USAGE.md](docs/TEMPLATE_USAGE.md) for the public-template/private-production workflow.

## Production Deployment

For an Aliyun ECS host where Nginx and Certbot run on the host and Docker runs only the app/PostgreSQL stack, use:

```bash
cp .env.production.example .env
docker compose -f docker-compose.aliyun.yml build
docker compose -f docker-compose.aliyun.yml up -d postgres
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate npm run admin:create
docker compose -f docker-compose.aliyun.yml up -d app
```

See [docs/ALIYUN_DEPLOYMENT.md](docs/ALIYUN_DEPLOYMENT.md).

Database backup helpers:

```bash
./scripts/backup-db.sh
./scripts/restore-db.sh backups/blog_db_YYYYMMDD_HHMMSS.dump
./scripts/install-backup-cron.sh
```

See [docs/BACKUP.md](docs/BACKUP.md).

## Safety

Do not commit real `.env` files, backups, uploaded files, SMTP credentials, admin passwords, cron secrets, private knowledge paths, or production database dumps.

Relevant paths are ignored by default:

```text
.env*
public/uploads/
uploads/
backups/
*.sql
*.dump
```

Before making a repository public, scan the working tree and git history for secrets.
