#!/bin/sh
# Run on the VPS, from the Studio 601 project directory.
set -eu
archive=${1:?Usage: sh scripts/import-content.sh /path/to/content.tar.gz}
test -f "$archive" || { echo 'Arquivo de conteúdo não encontrado.' >&2; exit 1; }
docker compose exec -T website sh -ec '
  umask 077
  transfer_dir=$(mktemp -d /tmp/studio601-import.XXXXXX)
  tar -xzf - -C "$transfer_dir"
  node scripts/transfer-content.mjs import "$transfer_dir"
' < "$archive"
