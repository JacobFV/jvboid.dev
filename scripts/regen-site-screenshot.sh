#!/usr/bin/env bash
#
# Regenerates public/assets/img/jacobfv-site/04-this-site.png — the
# screenshot of the *current* homepage used as the final frame in the
# "Site lineage" timeline on the jacobfv-site project page.
#
# ── REMINDER ───────────────────────────────────────────────────────────
# This is NOT run automatically by any build step. Re-run it by hand
# whenever the homepage hero changes noticeably (new pfp, new orbiters,
# layout shifts, theme tweaks) so the "This site" frame doesn't drift
# out of date. A good cadence is "whenever you'd notice the difference."
# ───────────────────────────────────────────────────────────────────────
#
# Usage:
#   ./scripts/regen-site-screenshot.sh
#
# It will reuse a dev server already listening on :3000, or start its
# own (and shut that one down afterwards). Requires Chromium/Chrome and
# ImageMagick (`convert`) on PATH.
#
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="public/assets/img/jacobfv-site/04-this-site.png"
URL="http://localhost:3000/"
PORT=3000

# Capture at a fixed 1280×1100 viewport, then crop to 1280×865. The crop
# line is chosen so the frame ends inside the hero's colour gradient,
# just below the bio paragraph and above the flat-background "Updates"
# section — i.e. no white band at the bottom. Re-check these numbers if
# the hero's vertical rhythm changes.
SHOT_W=1280
SHOT_H=1100
CROP_H=865

# --- locate tools --------------------------------------------------------
CHROME=""
for c in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
done
[ -n "$CHROME" ] || { echo "error: no Chromium/Chrome binary found on PATH" >&2; exit 1; }
command -v convert >/dev/null 2>&1 || { echo "error: ImageMagick 'convert' not found on PATH" >&2; exit 1; }

# --- ensure a dev server on :3000 ---------------------------------------
STARTED_DEV=""
cleanup() {
  [ -n "$STARTED_DEV" ] && kill "$STARTED_DEV" 2>/dev/null || true
}
trap cleanup EXIT

if curl -sf -o /dev/null "$URL" 2>/dev/null; then
  echo "• using dev server already on :$PORT"
else
  echo "• starting dev server (pnpm dev)…"
  pnpm dev >/tmp/regen-site-dev.log 2>&1 &
  STARTED_DEV=$!
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "$URL" 2>/dev/null && break
    sleep 1
  done
  curl -sf -o /dev/null "$URL" 2>/dev/null \
    || { echo "error: dev server never came up — see /tmp/regen-site-dev.log" >&2; exit 1; }
fi

# --- screenshot + crop ---------------------------------------------------
# Snap Chromium's confinement only lets it write under $HOME, and not to
# hidden (dot-prefixed) paths — so the scratch dir must be a plain one.
TMP="$(mktemp -d "${HOME}/regen-site-XXXXXX")"
trap 'cleanup; rm -rf "$TMP"' EXIT
RAW="$TMP/raw.png"

echo "• capturing homepage…"
"$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --screenshot="$RAW" --window-size="${SHOT_W},${SHOT_H}" \
  --virtual-time-budget=15000 "$URL" >/dev/null 2>&1

echo "• cropping to ${SHOT_W}×${CROP_H}…"
convert "$RAW" -crop "${SHOT_W}x${CROP_H}+0+0" +repage "$OUT"

echo "• refreshing image placeholders…"
pnpm exec tsx scripts/generate-image-placeholders.ts >/dev/null

echo "✓ wrote $OUT"
