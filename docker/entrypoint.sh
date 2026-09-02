#!/bin/sh
set -e
PUID=${PUID:-1000}
PGID=${PGID:-1000}

if [ "$(id -u)" = "0" ]; then
  if ! getent group "$PGID" >/dev/null 2>&1; then addgroup -g "$PGID" dashlab; fi
  GRP=$(getent group "$PGID" | cut -d: -f1)
  if ! getent passwd "$PUID" >/dev/null 2>&1; then adduser -D -H -u "$PUID" -G "$GRP" dashlab; fi
  mkdir -p "$CONTENT_DIR" "$ICONS_DIR"
  find /data -not -user "$PUID" -exec chown "$PUID:$PGID" {} + 2>/dev/null || true
  umask 002
  exec su-exec "$PUID:$PGID" "$@"
fi
exec "$@"
