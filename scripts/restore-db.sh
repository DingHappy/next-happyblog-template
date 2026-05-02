#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 backups/blog_db_YYYYMMDD_HHMMSS.dump" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.aliyun.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

db_user="$(docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" printenv POSTGRES_USER)"
db_name="$(docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" printenv POSTGRES_DB)"

echo "Restoring $BACKUP_FILE into database $db_name."
echo "This will drop and recreate the public schema."
printf "Type RESTORE to continue: "
read confirm

if [ "$confirm" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
  psql -U "$db_user" -d "$db_name" \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
  pg_restore -U "$db_user" -d "$db_name" --no-owner --no-acl \
  < "$BACKUP_FILE"

echo "Database restore completed from $BACKUP_FILE"
