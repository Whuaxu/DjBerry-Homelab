#!/usr/bin/env bash
# =============================================================================
# disk-guard: stop every qBittorrent torrent before downloads fill the disk
# -----------------------------------------------------------------------------
# The Pi has a single disk: downloads, the media library and every service
# (AdGuard, Plex, Jellyfin...) share it. When free space on /srv/data drops
# below MIN_FREE_GB, this stops all torrents and sends one WhatsApp alert.
# It never resumes them on its own: free some space, then resume by hand.
#
# Runs every minute from the user's crontab:
#   * * * * * $HOME/docker/qbittorrent/disk-guard.sh
# Logs go to the journal:  journalctl -t disk-guard
#
# Reads secrets from the existing env files (nothing is stored here):
#   homepage/homepage.env  HOMEPAGE_VAR_QBIT_USER / HOMEPAGE_VAR_QBIT_PASS
#   waha/bot.env           WAHA_API_KEY, WAHA_SESSION, ALLOWED_NUMBERS (first one gets the alert)
# =============================================================================
#
# Dry run (checks the qBittorrent login and the WAHA key, stops nothing, sends nothing):
#   DRY_RUN=1 ~/docker/qbittorrent/disk-guard.sh
# =============================================================================
set -euo pipefail

MIN_FREE_GB=30
DATA_DIR=/srv/data
QBIT_URL=http://127.0.0.1:8080
WAHA_URL=http://127.0.0.1:3020
DOCKER_DIR="$HOME/docker"
STATE_FILE="$DOCKER_DIR/qbittorrent/.disk-guard-tripped"   # exists while an incident is open: alert only once

log() { logger -t disk-guard "$*"; }

# Read KEY from an env file without sourcing it (values may contain spaces)
env_get() { sed -n "s/^$2=//p" "$1" | head -n1 | sed 's/^["'\'']//; s/["'\'']$//'; }

free_gb=$(df -BG --output=avail "$DATA_DIR" | tail -n1 | tr -dc '0-9')

if [[ "${DRY_RUN:-}" == "1" ]]; then
  hp="$DOCKER_DIR/homepage/homepage.env"; bot="$DOCKER_DIR/waha/bot.env"
  cookies=$(mktemp); trap 'rm -f "$cookies"' EXIT
  login=$(curl -s -o /dev/null -w '%{http_code}' -c "$cookies" \
    --data-urlencode "username=$(env_get "$hp" HOMEPAGE_VAR_QBIT_USER)" \
    --data-urlencode "password=$(env_get "$hp" HOMEPAGE_VAR_QBIT_PASS)" "$QBIT_URL/api/v2/auth/login" || true)
  waha=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Api-Key: $(env_get "$bot" WAHA_API_KEY)" \
    "$WAHA_URL/api/sessions/$(env_get "$bot" WAHA_SESSION)" || true)
  number=$(env_get "$bot" ALLOWED_NUMBERS | cut -d, -f1 | tr -dc '0-9')
  echo "free ${free_gb} GB (limit ${MIN_FREE_GB} GB) | qBittorrent login HTTP $login | WAHA session HTTP $waha | alert number: ${#number} digits"
  exit 0
fi

if (( free_gb >= MIN_FREE_GB )); then
  if [[ -e "$STATE_FILE" ]]; then
    rm -f "$STATE_FILE"
    log "free space back to ${free_gb} GB; guard re-armed (torrents stay stopped until resumed by hand)"
  fi
  exit 0
fi

[[ -e "$STATE_FILE" ]] && exit 0   # already stopped and alerted for this incident

# --- stop every torrent -------------------------------------------------------
qbit_user=$(env_get "$DOCKER_DIR/homepage/homepage.env" HOMEPAGE_VAR_QBIT_USER)
qbit_pass=$(env_get "$DOCKER_DIR/homepage/homepage.env" HOMEPAGE_VAR_QBIT_PASS)
cookies=$(mktemp)
trap 'rm -f "$cookies"' EXIT

login=$(curl -s -o /dev/null -w '%{http_code}' -c "$cookies" \
  --data-urlencode "username=$qbit_user" --data-urlencode "password=$qbit_pass" \
  "$QBIT_URL/api/v2/auth/login" || true)
if [[ "$login" == "200" || "$login" == "204" ]] && grep -q QBT_SID "$cookies"; then
  stop=$(curl -s -o /dev/null -w '%{http_code}' -b "$cookies" -d 'hashes=all' "$QBIT_URL/api/v2/torrents/stop" || true)
  if [[ "$stop" == "200" ]]; then
    result="Torrents PARADOS."
  else
    result="No he podido parar los torrents (HTTP $stop): páralos a mano."
  fi
else
  result="No he podido entrar en qBittorrent (HTTP $login): para los torrents a mano."
fi
log "free space ${free_gb} GB < ${MIN_FREE_GB} GB. $result"

# --- one WhatsApp alert -------------------------------------------------------
waha_key=$(env_get "$DOCKER_DIR/waha/bot.env" WAHA_API_KEY)
waha_session=$(env_get "$DOCKER_DIR/waha/bot.env" WAHA_SESSION)
number=$(env_get "$DOCKER_DIR/waha/bot.env" ALLOWED_NUMBERS | cut -d, -f1 | tr -dc '0-9')
text="💾 Disco del Pi casi lleno: quedan ${free_gb} GB (límite ${MIN_FREE_GB} GB). ${result} Libera espacio y reanúdalos desde qBittorrent."
payload=$(python3 -c 'import json,sys; print(json.dumps({"session": sys.argv[1], "chatId": sys.argv[2] + "@c.us", "text": sys.argv[3]}))' \
  "${waha_session:-default}" "$number" "$text")
sent=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Api-Key: $waha_key" -H 'Content-Type: application/json' \
  -d "$payload" "$WAHA_URL/api/sendText" || true)
log "WhatsApp alert HTTP $sent"

touch "$STATE_FILE"
