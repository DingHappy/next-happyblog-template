# Backup And Restore

This project stores PostgreSQL data in a Docker volume. Do not rely on the volume as your only copy of production data.

## Manual Backup

Run from the project root:

```bash
./scripts/backup-db.sh
```

The script writes a custom-format PostgreSQL dump:

```text
backups/blog_db_YYYYMMDD_HHMMSS.dump
```

It reads `POSTGRES_USER` and `POSTGRES_DB` from the running `postgres` container, so it does not need to parse `.env`.

Optional environment variables:

```bash
COMPOSE_FILE=docker-compose.aliyun.yml
POSTGRES_SERVICE=postgres
BACKUP_DIR=backups
RETENTION_DAYS=30
```

## Restore

Run from the project root:

```bash
./scripts/restore-db.sh backups/blog_db_YYYYMMDD_HHMMSS.dump
```

The restore script drops and recreates the `public` schema. It requires typing `RESTORE` before making changes.

## Daily Cron Backup

Install a daily 02:00 backup cron:

```bash
./scripts/install-backup-cron.sh
```

Customize schedule or project directory:

```bash
SCHEDULE="30 3 * * *" PROJECT_DIR=/opt/my-blog-production ./scripts/install-backup-cron.sh
```

View the installed cron:

```bash
crontab -l
```

The installed command appends logs to:

```text
backups/backup.log
```

## What To Copy Off The Server

At minimum, copy these paths to another machine or object storage:

```text
backups/*.dump
.env
```

If users upload media, also copy:

```text
Docker volume: uploads
```

For host-level Nginx and Certbot deployments, certificates are managed under:

```text
/etc/letsencrypt/
```

## Dangerous Commands

Avoid these on production unless you have a current backup and intend to remove data:

```bash
docker compose down -v
docker system prune --volumes
docker volume rm ...
```
