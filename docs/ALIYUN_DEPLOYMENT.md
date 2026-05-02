# Aliyun ECS Deployment

This guide deploys the app on an Aliyun ECS host with Docker for the app and PostgreSQL, while the host-level Nginx handles HTTPS and public traffic.

## Architecture

```text
Internet
  -> host Nginx :80/:443
  -> 127.0.0.1:3000
  -> Docker blog-app
  -> Docker blog-postgres
```

Use `docker-compose.aliyun.yml` for this layout. Do not start the compose Nginx service from `docker-compose.prod.yml` on the same host, because host Nginx already owns ports 80 and 443.

## Server Prerequisites

Install required tools:

```bash
yum install -y git docker
systemctl enable --now docker
docker --version
docker compose version
```

If Docker Hub is slow or unavailable, configure a registry mirror in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": [
    "https://your-mirror.example.com"
  ]
}
```

Then restart Docker:

```bash
systemctl daemon-reload
systemctl restart docker
```

## Clone And Configure

```bash
cd /opt
git clone https://github.com/your-name/your-production-repo.git my-blog-production
cd my-blog-production
cp .env.production.example .env
vim .env
```

Required production values:

```env
NEXT_PUBLIC_URL=https://blog.example.com
NEXT_PUBLIC_SITE_URL=https://blog.example.com
APP_PORT=3000

DB_HOST=postgres
DB_PORT=5432
DB_USER=blog
DB_PASSWORD=change_to_a_letters_and_numbers_password
DB_NAME=blog_db
DATABASE_URL=postgresql://blog:change_to_a_letters_and_numbers_password@postgres:5432/blog_db?schema=public&connect_timeout=30&pool_timeout=30

ADMIN_PASSWORD=change_to_a_strong_admin_password
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
NEXTAUTH_SECRET=replace_with_openssl_rand_hex_32
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -hex 32
```

Keep `DB_PASSWORD` and the password inside `DATABASE_URL` identical. Prefer letters and numbers only for `DB_PASSWORD` to avoid URL escaping problems.

## Build And Start

```bash
docker compose -f docker-compose.aliyun.yml build
docker compose -f docker-compose.aliyun.yml up -d postgres
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate npm run admin:create
docker compose -f docker-compose.aliyun.yml up -d app
```

Check the app:

```bash
docker ps
docker logs blog-app --tail=100
curl -I http://127.0.0.1:3000
```

## Host Nginx

Use host Nginx as the public reverse proxy:

```nginx
server {
    listen 80;
    server_name blog.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name blog.example.com;

    ssl_certificate /etc/letsencrypt/live/blog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Apply changes:

```bash
nginx -t
systemctl reload nginx
```

## HTTPS Certificate

If Certbot has the Nginx plugin:

```bash
certbot --nginx -d blog.example.com
certbot renew --dry-run --cert-name blog.example.com
```

If only the webroot plugin is available, add an ACME challenge location to the port 80 server before the redirect:

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type "text/plain";
}
```

Then issue:

```bash
mkdir -p /var/www/certbot/.well-known/acme-challenge
certbot certonly --webroot -w /var/www/certbot -d blog.example.com
nginx -t
systemctl reload nginx
```

## Updates

```bash
cd /opt/my-blog-production
git pull origin main
docker compose -f docker-compose.aliyun.yml build
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate
docker compose -f docker-compose.aliyun.yml up -d app
```

If you changed `ADMIN_PASSWORD` or need to reset the first admin account, run:

```bash
docker compose -f docker-compose.aliyun.yml --profile tools run --rm migrate npm run admin:create
```

Use `--no-cache` only when changing base image dependencies or debugging stale Docker layers.

The Dockerfile keeps dependency installation and Prisma Client generation in a stable cache layer. Normal source-only updates should use `build` without `--no-cache`.

Optionally pass version metadata into the image:

```bash
APP_VERSION=1.0.0 BUILD_SHA="$(git rev-parse --short HEAD)" docker compose -f docker-compose.aliyun.yml build
```

## Backups

Create a database backup:

```bash
./scripts/backup-db.sh
```

Restore a backup:

```bash
./scripts/restore-db.sh backups/blog_db_YYYYMMDD_HHMMSS.dump
```

Schedule daily backups:

```cron
0 2 * * * cd /opt/my-blog-production && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

Or install the cron entry from the project root:

```bash
./scripts/install-backup-cron.sh
```

Do not run `docker compose down -v` or `docker system prune --volumes` unless you intentionally want to remove database volumes.

## Health Check

The application exposes:

```bash
curl http://127.0.0.1:3000/api/health
```

The response includes database status, Prisma migration status, process memory, uptime, app version, build commit, Node.js version, and platform information.

## First Admin User

On first successful admin login, the app ensures a `superadmin` user exists:

```text
username: admin
password: ADMIN_PASSWORD from .env
```

In production, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` is required at runtime. The development fallback is only for local non-production use.
New stored user password hashes use bcrypt. Legacy SHA256 hashes remain compatible and are upgraded after successful named-user login.
