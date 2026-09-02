#!/usr/bin/env bash
# ============================================================
# prepush-validate.sh — Validación general antes de subir cambios
# ============================================================
# Objetivo: atrapar ANTES del push (y antes de que llegue a prod) los fallos que
# el CI de lint/build NO ve, en particular los errores de ARRANQUE de la Lambda
# (p. ej. schema.sql que rompe initDatabase contra Neon -> 500 en toda la app).
#
# Corre en orden y ABORTA al primer fallo (set -e), imprimiendo el error para
# poder corregirlo. Lo invoca el hook PreToolUse sobre `git push`.
#
# Pasos:
#   1. Formato (prettier --check)  — lo que exige el CI.
#   2. Lint (backend + frontend)   — lo que exige el CI.
#   3. Build (backend + frontend)  — que compile.
#   4. Arranque contra Neon: aplica schema.sql (initDatabase) y hace un smoke del
#      health montando Express. SOLO si hay DATABASE_URL (backend/.env); si no,
#      se salta con aviso (no bloquea por falta de credenciales locales).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log()  { printf '\n\033[1;36m[prepush]\033[0m %s\n' "$1"; }
fail() { printf '\n\033[1;31m[prepush] FALLO:\033[0m %s\n' "$1" >&2; exit 1; }

log "1/4 Formato (prettier --check)"
npm run format:check --silent || fail "Prettier encontró archivos sin formatear. Corre 'npm run format'."

log "2/4 Lint (backend + frontend)"
npm run lint --silent || fail "ESLint encontró errores. Revisa la salida de arriba."

log "3/4 Build (backend + frontend)"
npm run build --silent || fail "El build (tsc/vite) falló. Revisa la salida de arriba."

# ── 4. Validación de arranque contra la base (lo que atrapa el 23505) ──
DBURL="${DATABASE_URL:-}"
if [ -z "$DBURL" ] && [ -f backend/.env ]; then
  DBURL="$(grep -E '^DATABASE_URL=' backend/.env | head -1 | cut -d= -f2- || true)"
fi

if [ -z "$DBURL" ]; then
  log "4/4 Arranque contra Neon: OMITIDO (no hay DATABASE_URL local). El CI/CD hará el health check post-deploy."
else
  log "4/4 Arranque contra Neon: aplicar schema.sql + smoke de /api/health"
  # tsx está hoisteado a node_modules/.bin por los workspaces. El smoke vive en
  # scripts/ (no se despliega) e importa el código fuente del backend directamente.
  TSX="node_modules/.bin/tsx"
  [ -x "$TSX" ] || TSX="npx tsx"
  DATABASE_URL="$DBURL" $TSX scripts/prepush-smoke.ts \
    || fail "El arranque contra la base falló (schema.sql/initDatabase o el health). ESTO tumbaría la Lambda en prod."
fi

log "OK: todas las validaciones pasaron. Push permitido."
