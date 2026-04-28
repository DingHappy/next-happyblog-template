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
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Template Customization

Generic public defaults live in:

```text
src/config/site.ts
```

Use `NEXT_PUBLIC_*` variables or private production commits to customize site name, author information, About page content, and social links.

See [docs/TEMPLATE_USAGE.md](docs/TEMPLATE_USAGE.md) for the public-template/private-production workflow.

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
