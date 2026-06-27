#!/usr/bin/env bash
# package-extension.sh — produce the Chrome Web Store upload zip for the FREE build.
#
# The free build is intentionally lean: rules + your sensitive terms, zero network,
# no model. It zips only what the extension needs to run, and explicitly excludes
# any Pro/Phase-2 artifacts (the names model, ORT runtime, offscreen document) that
# may be present on disk from development. The store listing art and source SVG are
# left out too.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -e "console.log(require('./extension/manifest.json').version)")
OUT="airlock-extension-v${VERSION}.zip"

# preflight: the free build's required files
for f in extension/manifest.json extension/redact.js extension/content.js \
         extension/content.css extension/popup.html extension/popup.js; do
  [ -f "$f" ] || { echo "MISSING: $f"; exit 1; }
done

rm -f "$OUT"
( cd extension && zip -r -q "../$OUT" . \
    -x "store/*" "models/*" "ort/*" "offscreen/*" "background.js" \
       "README.md" "icon.svg" ".DS_Store" "**/.DS_Store" )

echo "Built $OUT  ($(du -h "$OUT" | cut -f1))  — free build, network-free"
echo "Upload at: https://chrome.google.com/webstore/devconsole"
