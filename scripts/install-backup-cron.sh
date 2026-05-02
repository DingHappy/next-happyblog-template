#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
SCHEDULE="${SCHEDULE:-0 2 * * *}"
BACKUP_LOG="${BACKUP_LOG:-backups/backup.log}"
MARKER="next-happyblog-template database backup"

if ! command -v crontab >/dev/null 2>&1; then
  echo "crontab command not found. Install cron first." >&2
  exit 1
fi

mkdir -p "$PROJECT_DIR/backups"

cron_line="$SCHEDULE cd $PROJECT_DIR && ./scripts/backup-db.sh >> $BACKUP_LOG 2>&1 # $MARKER"
tmp_file="$(mktemp)"

crontab -l 2>/dev/null | grep -v "$MARKER" > "$tmp_file" || true
printf '%s\n' "$cron_line" >> "$tmp_file"
crontab "$tmp_file"
rm -f "$tmp_file"

echo "Installed backup cron:"
echo "$cron_line"
