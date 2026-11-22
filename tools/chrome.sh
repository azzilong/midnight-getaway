#!/usr/bin/env bash
# Midnight Getaway — headless Chrome launcher for capture/playtest.
# The VM's Chrome ("Muse Browser") refuses to start without a Hatch WebGL
# domain policy: pass the shared policy file + its SHA-256. Policy file
# ~/workspace/makefun/webgl-domains.txt holds one line,
# "hatch-webgl-all-origins-v1". Usage: chrome.sh <port> <user-data-dir> [url]
set -euo pipefail
PORT="${1:-9223}"
PROFILE="${2:-/tmp/midnight-chrome}"
URL="${3:-about:blank}"
POLICY="$HOME/workspace/makefun/webgl-domains.txt"
SHA="$(sha256sum "$POLICY" | cut -d' ' -f1)"
exec /opt/meta-chromium/chrome --headless=new \
  --remote-debugging-port="$PORT" --remote-allow-origins='*' \
  --window-size=1280,720 --no-sandbox --no-first-run --no-default-browser-check \
  --disable-extensions --disable-dev-shm-usage --enable-unsafe-swiftshader \
  --allow-file-access-from-files \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --user-data-dir="$PROFILE" "$URL"
