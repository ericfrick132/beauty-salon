#!/usr/bin/env bash
# Genera docs/support-kb.md desde el repo (claude headless) y lo sube a sales-hub.
# La KB es la fuente de verdad del bot de soporte de WhatsApp — se regenera en cada
# deploy (o a mano tras un cambio grande de producto), NUNCA en runtime.
#
# Uso:
#   SALESHUB_HUB_URL=https://api.sales.efcloud.tech SALESHUB_HUB_KEY=xxx ./scripts/generate-support-kb.sh
#   (sin las env vars: genera el doc local y no sube)
#
# Requiere: claude CLI, jq, curl.
set -euo pipefail
cd "$(dirname "$0")/.."

PRODUCT_KEY="${PRODUCT_KEY:-turnospro}"
OUT="docs/support-kb.md"
mkdir -p docs

echo "Generando KB de soporte de $PRODUCT_KEY desde el repo..."
claude -p "$(cat scripts/support-kb-prompt.md)" \
  --allowedTools "Read,Glob,Grep" \
  --output-format text > "$OUT"

BYTES=$(wc -c < "$OUT" | tr -d ' ')
if [ "$BYTES" -lt 2000 ]; then
  echo "ERROR: la KB generada es sospechosamente corta ($BYTES bytes) — no se sube" >&2
  exit 1
fi
echo "KB generada: $BYTES bytes → $OUT"

if [ -n "${SALESHUB_HUB_URL:-}" ] && [ -n "${SALESHUB_HUB_KEY:-}" ]; then
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
  jq -n --arg pk "$PRODUCT_KEY" --arg v "$SHA" --rawfile content "$OUT" \
    '{productKey: $pk, content: $content, sourceVersion: $v}' \
    | curl -fsS -X POST "${SALESHUB_HUB_URL%/}/api/hub/knowledge" \
        -H "X-Api-Key: $SALESHUB_HUB_KEY" \
        -H "Content-Type: application/json" \
        --data @-
  echo
  echo "KB subida a sales-hub ($PRODUCT_KEY, v $SHA)"
else
  echo "SALESHUB_HUB_URL/SALESHUB_HUB_KEY no seteados: doc generado local, sin subir."
fi
