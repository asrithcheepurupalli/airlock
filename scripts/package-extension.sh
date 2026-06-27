#!/usr/bin/env bash
# package-extension.sh — produce the Chrome Web Store upload zip.
#
# ONE package, two tiers. It ships the on-device names model (offscreen document +
# weights + ORT runtime) so Pro can run it locally, but the model is DORMANT until
# a valid offline license activates it: free users never create the offscreen
# document, so they never load the weights. The model travels in the package
# because Airlock takes no network permission and fetches nothing at runtime — the
# weights can't be downloaded later without breaking that guarantee.
#
# Run `npm run build:ext` first so offscreen/, models/ and ort/ exist on disk.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -e "console.log(require('./extension/manifest.json').version)")
OUT="airlock-extension-v${VERSION}.zip"

# preflight: everything the wired build needs to run
for f in extension/manifest.json extension/redact.js extension/license-pubkey.js \
         extension/license.js extension/content.js extension/inject-main.js extension/content.css \
         extension/popup.html extension/popup.js extension/background.js \
         extension/activate-bridge.js extension/offscreen/offscreen.html; do
  [ -f "$f" ] || { echo "MISSING: $f (run 'npm run build:ext'?)"; exit 1; }
done
[ -d extension/models ] || { echo "MISSING: extension/models (run 'npm run build:ext')"; exit 1; }
[ -d extension/ort ]    || { echo "MISSING: extension/ort (run 'npm run build:ext')"; exit 1; }

rm -f "$OUT"
( cd extension && zip -r -q "../$OUT" . \
    -x "store/*" "README.md" "icon.svg" ".DS_Store" "**/.DS_Store" )

echo "Built $OUT  ($(du -h "$OUT" | cut -f1))  — model bundled, dormant until Pro, network-free"
echo "Upload at: https://chrome.google.com/webstore/devconsole"
