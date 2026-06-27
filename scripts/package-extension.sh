#!/usr/bin/env bash
# package-extension.sh — produce the Chrome Web Store upload zip.
#
# Run `npm run build:ext` first so the offscreen build, model weights, and ORT
# runtime are present. This zips only what the extension needs to run, leaving
# out the store listing art, the source SVG, and the README.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -e "console.log(require('./extension/manifest.json').version)")
OUT="airlock-extension-v${VERSION}.zip"

# preflight: the heavy build artifacts must exist
for f in extension/offscreen/offscreen.html \
         extension/models/Xenova/bert-base-NER/onnx/model_quantized.onnx \
         extension/ort/ort-wasm-simd-threaded.jsep.wasm; do
  [ -f "$f" ] || { echo "MISSING: $f  — run: npm run build:ext"; exit 1; }
done

rm -f "$OUT"
( cd extension && zip -r -q "../$OUT" . \
    -x "store/*" "README.md" "icon.svg" ".DS_Store" "**/.DS_Store" )

echo "Built $OUT  ($(du -h "$OUT" | cut -f1))"
echo "Upload at: https://chrome.google.com/webstore/devconsole"
