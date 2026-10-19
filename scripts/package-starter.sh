#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=$(node -p "require('$ROOT/package.json').version")
OUTPUT="$ROOT/dist/forge-starter-v$VERSION.zip"

mkdir -p "$ROOT/dist"
rm -f "$OUTPUT"
cd "$ROOT"
zip -qr "$OUTPUT" . \
  -x '.git/*' 'node_modules/*' '.next/*' 'dist/*' '.DS_Store' '.env*' \
     '.kiro/*' '.vscode/*' '*.tsbuildinfo' 'next-env.d.ts'

echo "Created $OUTPUT"
