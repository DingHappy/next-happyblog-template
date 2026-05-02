# Public Template and Private Production Setup

This project is designed to work as a public template repository while your real production site stays private.

## Repository Layout

Recommended setup:

- Public repository: template source code, migrations, example env, docs, Docker files.
- Private repository or private server directory: production env, real content overrides, uploaded files, database backups, deployment secrets.

If you are converting an existing private project into a public template, prefer publishing a fresh repository or an orphan public branch. Do not simply flip the existing repository to public until you have checked its full git history.

## What Must Stay Private

Do not commit these to the public template:

- `.env`, `.env.production`, or any real environment file
- database dumps, JSON backups, SQL backups
- `public/uploads/`, `uploads/`, and `backups/`
- SMTP passwords, admin passwords, cron secrets, scheduled publish secrets
- real server IPs, private filesystem paths, private knowledge base paths
- private About page content if it contains personal information you do not want public

## Template Configuration

Public display defaults live in:

```text
src/config/site.ts
```

Production can override common fields with environment variables:

```bash
NEXT_PUBLIC_SITE_NAME="Your Site Name"
NEXT_PUBLIC_SITE_TITLE="Your Site Name - Your Tagline"
NEXT_PUBLIC_SITE_DESCRIPTION="Your public site description"
NEXT_PUBLIC_AUTHOR_NAME="Your Name"
NEXT_PUBLIC_AUTHOR_BIO="Your public bio"
NEXT_PUBLIC_SOCIAL_GITHUB="https://github.com/your-name"
```

For richer private customization, keep changes in your private production repository and merge template updates into it.

## Private Production Repository Flow

Create a private production repository from this template, then add the public template as an upstream remote:

```bash
git remote add template git@github.com:your-name/my-blog-template.git
git fetch template
```

When template development is ready to ship:

```bash
git fetch template
git merge template/main
npx prisma migrate deploy
npm run build
```

Resolve conflicts only in private customization files. Keep production-only content isolated so future merges stay small.

For Docker-based production, use the compose file that matches the host:

```bash
# Host Nginx owns ports 80/443, Docker runs only app and postgres.
docker compose -f docker-compose.aliyun.yml build
docker compose -f docker-compose.aliyun.yml up -d postgres
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate
docker compose -f docker-compose.aliyun.yml up -d app
```

Before merging template updates into production, confirm the production repository has no uncommitted private changes:

```bash
git status --short
```

After merging, verify:

```bash
npm run lint
npm run build
```

## Recommended Private Files

Common private-only files:

```text
.env
.env.production
public/uploads/
backups/
knowledge/
```

These paths are already ignored by `.gitignore`.

## Public Release Checklist

Before making the template repository public:

```bash
git status --short
rg -n "password|secret|token|PRIVATE|/Users|192\\.168|DATABASE_URL" . --glob '!node_modules/**' --glob '!.next/**' --glob '!src/generated/**'
git log --all -S "your-real-secret"
```

If a real secret was ever committed, rotate the secret. Deleting it from the latest commit is not enough for a public repository.

If old commits contain private paths, IPs, or secrets, the cleanest options are:

```bash
# Option A: create a new public repository and push only the current cleaned tree

# Option B: create an orphan public branch
git checkout --orphan public-template
git add .
git commit -m "initial public template"
git push origin public-template
```

Only make the original history public if you are comfortable with everything in every commit.
