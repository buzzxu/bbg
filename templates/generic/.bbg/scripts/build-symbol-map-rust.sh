#!/usr/bin/env bash

# build-symbol-map-rust.sh - Rust symbol extractor via regex on pub symbols.
#
# Scans .rs source files for `pub` declarations (fn, struct, enum, trait,
# type, const, mod) and extracts `use` dependencies.
#
# Usage: bash .bbg/scripts/build-symbol-map-rust.sh [--root <dir>]
#
# Output: .bbg/context/symbol-map.json (unified format)
#
# Zero extra dependencies - uses only bash, rg, and sed.

set -euo pipefail

ROOT="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

OUTPUT_DIR="$ROOT/.bbg/context"
OUTPUT_FILE="$OUTPUT_DIR/symbol-map.json"
mkdir -p "$OUTPUT_DIR"

mapfile -t RS_FILES < <(
  rg --files -g "**/*.rs" -g "!**/target/**" -g "!**/.git/**" -g "!**/.bbg/**" -g "!**/node_modules/**" "$ROOT" 2>/dev/null | sort
)

if [ "${#RS_FILES[@]}" -eq 0 ]; then
  printf '{"generated_at":"%s","language":"rust","extractor":"build-symbol-map-rust.sh","symbols":[]}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUTPUT_FILE"
  echo "No Rust source files found."
  exit 0
fi

GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FIRST=true
printf '{"generated_at":"%s","language":"rust","extractor":"build-symbol-map-rust.sh","symbols":[' "$GENERATED_AT" > "$OUTPUT_FILE"

for FILE in "${RS_FILES[@]}"; do
  REL_FILE=$(realpath --relative-to="$ROOT" "$FILE" 2>/dev/null || echo "$FILE")

  DEPS=$(rg -n '^\s*use\s+' "$FILE" --no-heading 2>/dev/null | sed 's/^[0-9]\+://' | sed 's/.*use\s\+//' | sed 's/\s*;.*//' | sed 's/.*:://' | sed 's/[{},]/ /g' | tr ' ' '\n' | rg '^[A-Z]' | sort -u | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//')
  [ -z "$DEPS" ] && DEPS_ARR="[]" || DEPS_ARR="[$DEPS]"

  while IFS=: read -r LINE_NUM LINE_CONTENT; do
    FUNC_NAME=$(printf "%s" "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(async\s\+\)\?fn\s\+\([a-zA-Z_][a-zA-Z0-9_]*\).*/\2/p')
    [ -z "$FUNC_NAME" ] && continue
    SIGNATURE=$(printf "%s" "$LINE_CONTENT" | sed 's/^\s*//; s/\s*{.*//; s/"/\\"/g')
    MODS='["public"]'
    printf "%s" "$LINE_CONTENT" | rg -q "async" && MODS='["public","async"]'

    [ "$FIRST" = true ] && FIRST=false || printf ',' >> "$OUTPUT_FILE"
    printf '{"name":"%s","kind":"function","file":"%s","line":%s,"exported":true,"modifiers":%s,"dependencies":%s,"dependents":[],"signature":"%s"}' \
      "$FUNC_NAME" "$REL_FILE" "$LINE_NUM" "$MODS" "$DEPS_ARR" "$SIGNATURE" >> "$OUTPUT_FILE"
  done < <(rg -n '^\s*pub(\s+async)?\s+fn\s+' "$FILE" --no-heading 2>/dev/null)

  while IFS=: read -r LINE_NUM LINE_CONTENT; do
    KIND=$(printf "%s" "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(struct\|enum\|trait\|type\)\s\+.*/\1/p')
    NAME=$(printf "%s" "$LINE_CONTENT" | sed -n 's/.*pub\s\+\(struct\|enum\|trait\|type\)\s\+\([A-Za-z_][A-Za-z0-9_]*\).*/\2/p')
    [ -z "$NAME" ] && continue

    [ "$FIRST" = true ] && FIRST=false || printf ',' >> "$OUTPUT_FILE"
    printf '{"name":"%s","kind":"%s","file":"%s","line":%s,"exported":true,"modifiers":["public"],"dependencies":%s,"dependents":[],"signature":null}' \
      "$NAME" "$KIND" "$REL_FILE" "$LINE_NUM" "$DEPS_ARR" >> "$OUTPUT_FILE"
  done < <(rg -n '^\s*pub\s+(struct|enum|trait|type)\s+' "$FILE" --no-heading 2>/dev/null)
done

printf ']}' >> "$OUTPUT_FILE"
SYMBOL_COUNT=$(rg -c '"name"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
echo "Symbol map: $SYMBOL_COUNT symbols extracted -> $OUTPUT_FILE"
