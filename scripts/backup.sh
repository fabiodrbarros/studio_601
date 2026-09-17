#!/bin/sh
# Run from the project directory. Briefly stops ONLY this Compose website.
set -eu
backup_dir=${1:?Usage: sh scripts/backup.sh /absolute/private/backup/directory}
case "$backup_dir" in /*) ;; *) echo 'Use an absolute backup directory.' >&2; exit 1;; esac
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup_file="studio601-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
docker compose ps --status running --services | grep -qx website || { echo 'website must be running before backup.' >&2; exit 1; }
docker compose stop website
trap 'docker compose start website >/dev/null' EXIT
# Root is used only for this maintenance helper, not for the application.
docker compose run --rm --no-deps --user 0 --cap-add DAC_OVERRIDE --entrypoint sh \
  -v "$backup_dir:/backup" -e BACKUP_FILE="$backup_file" website -ec '
    umask 077
    test ! -e "/backup/$BACKUP_FILE"
    tar -czf "/backup/$BACKUP_FILE" -C /data .
    tar -tzf "/backup/$BACKUP_FILE" >/dev/null
  '
echo "Backup: $backup_dir/$backup_file"
