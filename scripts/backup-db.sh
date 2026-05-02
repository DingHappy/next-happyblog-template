#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.aliyun.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

timestamp="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

db_user="$(docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" printenv POSTGRES_USER)"
db_name="$(docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" printenv POSTGRES_DB)"
backup_file="$BACKUP_DIR/${db_name}_${timestamp}.dump"

docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
  pg_dump -U "$db_user" -d "$db_name" --format=custom --no-owner --no-acl \
  > "$backup_file"

find "$BACKUP_DIR" -type f -name "${db_name}_*.dump" -mtime +"$RETENTION_DAYS" -delete

echo "Database backup written to $backup_file"
