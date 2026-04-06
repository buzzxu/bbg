#!/usr/bin/env bash

# build-symbol-map-go.sh - Go symbol extractor via go doc + go list.
#
# Uses `go list -json` to enumerate packages and `go doc` to extract
# exported symbols with their types and signatures.
#
# Usage: bash .bbg/scripts/build-symbol-map-go.sh [--root <dir>]
#
# Output: .bbg/context/symbol-map.json (unified format)
#
# Zero extra dependencies - uses only Go toolchain (go doc, go list).

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
TEMP_FILE="$(mktemp)"

mkdir -p "$OUTPUT_DIR"

cd "$ROOT"

PACKAGES=$(go list ./... 2>/dev/null || echo "")
if [ -z "$PACKAGES" ]; then
  printf '{"generated_at":"%s","language":"go","extractor":"build-symbol-map-go.sh","symbols":[]}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUTPUT_FILE"
  echo "No Go packages found."
  exit 0
fi

echo '[' > "$TEMP_FILE"
FIRST=true

for PKG in $PACKAGES; do
  PKG_DIR=$(go list -f '{{.Dir}}' "$PKG" 2>/dev/null || continue)
  REL_DIR=$(realpath --relative-to="$PWD" "$PKG_DIR" 2>/dev/null || echo "$PKG_DIR")
  DOC_OUTPUT=$(go doc -all "$PKG" 2>/dev/null || continue)

  while IFS= read -r line; do
    FUNC_NAME=$(printf "%s" "$line" | sed -n 's/^func \([A-Z][A-Za-z0-9_]*\).*/\1/p')
    if [ -n "$FUNC_NAME" ]; then
      SIGNATURE=$(printf "%s" "$line" | sed 's/^func //; s/"/\\"/g')
      LINE_NUM=0
      REL_FILE="$REL_DIR"
      for gofile in "$PKG_DIR"/*.go; do
        [ -f "$gofile" ] || continue
        FOUND=$(rg -n "^func ${FUNC_NAME}" "$gofile" -m 1 --no-heading 2>/dev/null | cut -d: -f1)
        if [ -n "$FOUND" ]; then
          LINE_NUM=$FOUND
          REL_FILE=$(realpath --relative-to="$PWD" "$gofile" 2>/dev/null || echo "$gofile")
          break
        fi
      done

      [ "$FIRST" = true ] && FIRST=false || echo ',' >> "$TEMP_FILE"
      printf '{"name":"%s","kind":"function","file":"%s","line":%s,"exported":true,"modifiers":["public"],"dependencies":[],"dependents":[],"signature":"%s"}' \
        "$FUNC_NAME" "$REL_FILE" "$LINE_NUM" "$SIGNATURE" >> "$TEMP_FILE"
    fi
  done <<< "$DOC_OUTPUT"

  while IFS= read -r line; do
    TYPE_NAME=$(printf "%s" "$line" | sed -n 's/^type \([A-Z][A-Za-z0-9_]*\) \(struct\|interface\|int\|string\|.*\)/\1/p')
    KIND=$(printf "%s" "$line" | sed -n 's/^type [A-Z][A-Za-z0-9_]* \(struct\|interface\).*/\1/p')
    [ -z "$KIND" ] && KIND="type"
    if [ -n "$TYPE_NAME" ]; then
      LINE_NUM=0
      REL_FILE="$REL_DIR"
      for gofile in "$PKG_DIR"/*.go; do
        [ -f "$gofile" ] || continue
        FOUND=$(rg -n "^type ${TYPE_NAME} " "$gofile" -m 1 --no-heading 2>/dev/null | cut -d: -f1)
        if [ -n "$FOUND" ]; then
          LINE_NUM=$FOUND
          REL_FILE=$(realpath --relative-to="$PWD" "$gofile" 2>/dev/null || echo "$gofile")
          break
        fi
      done

      [ "$FIRST" = true ] && FIRST=false || echo ',' >> "$TEMP_FILE"
      printf '{"name":"%s","kind":"%s","file":"%s","line":%s,"exported":true,"modifiers":["public"],"dependencies":[],"dependents":[],"signature":null}' \
        "$TYPE_NAME" "$KIND" "$REL_FILE" "$LINE_NUM" >> "$TEMP_FILE"
    fi
  done <<< "$DOC_OUTPUT"
done

echo ']' >> "$TEMP_FILE"

GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SYMBOLS=$(<"$TEMP_FILE")
cat > "$OUTPUT_FILE" <<EOF
{
  "generated_at": "$GENERATED_AT",
  "language": "go",
  "extractor": "build-symbol-map-go.sh",
  "symbols": $SYMBOLS
}
EOF

rm -f "$TEMP_FILE"
SYMBOL_COUNT=$(rg -c '"name"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
echo "Symbol map: $SYMBOL_COUNT symbols extracted -> $OUTPUT_FILE"
