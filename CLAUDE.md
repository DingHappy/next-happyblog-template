@AGENTS.md

# CLAUDE.md

This file gives coding agents repository-local context. Keep it generic because this repository is intended to be safe for a public template.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Prisma 5, and PostgreSQL.

Next.js 16 and React 19 include breaking changes. Before editing routing, Server Components, Route Handlers, caching, or metadata code, read the relevant guide under `node_modules/next/dist/docs/`.

## Common Commands

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

## Public Template Rules

- Do not commit `.env`, production credentials, database dumps, uploaded files, or backup files.
- Keep real production content in a private repository, private branch, server environment variables, or database settings.
- Public defaults should be generic. Put site-specific overrides in `src/config/site.ts` through `NEXT_PUBLIC_*` variables or in admin settings.
- Uploaded media belongs in `public/uploads/`; backup artifacts belong in `backups/`. Both are gitignored.

## Architecture Notes

- Public pages live in `src/app/`.
- Admin UI lives under `src/app/admin/`.
- Admin and operational APIs live under `src/app/api/admin/`.
- Shared display configuration lives in `src/config/site.ts`.
- Runtime settings backed by the database live in `src/lib/settings.ts`.
- Always import the Prisma singleton from `src/lib/prisma.ts`.
- Auth/session helpers live in `src/lib/auth.ts`.
- Audit helpers live in `src/lib/audit.ts`.

## Knowledge Sync

Knowledge sync reads Markdown files from `KNOWLEDGE_BASE_PATH`. The public template default is `knowledge/docs` under the project root. Production deployments should set `KNOWLEDGE_BASE_PATH` explicitly in private environment variables.
