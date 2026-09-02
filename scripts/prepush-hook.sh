#!/usr/bin/env bash
# ============================================================
# prepush-hook.sh — Entrada del hook PreToolUse para `git push`
# ============================================================
# El hook PreToolUse se dispara ANTES de ejecutar una herramienta. Recibe por
# STDIN un JSON con el contexto (incluye el comando que se va a correr). Este
# wrapper:
#   1. Lee el comando del stdin.
#   2. Si NO es un `git push`, sale 0 (no interfiere con otros comandos).
#   3. Si es un `git push`, corre la validación general (prepush-validate.sh).
#      - Si pasa: exit 0 -> el push procede.
#      - Si falla: exit 2 -> BLOQUEA el push y manda el error por stderr para
#        que el agente lo lea y lo corrija (no esperar a que prod se caiga).
#
# Exit-codes del hook PreToolUse:
#   0 = permitir | 2 = bloquear (stderr se reenvía) | otro = fallo silencioso.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Leer el payload del hook (best-effort; si no hay jq, usar grep).
PAYLOAD="$(cat 2>/dev/null || true)"
CMD=""
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$PAYLOAD" | jq -r '.. | .command? // empty' 2>/dev/null | head -1)"
fi
if [ -z "$CMD" ]; then
  CMD="$PAYLOAD" # fallback: buscar el patrón sobre el payload crudo
fi

# ¿Es un git push? (cubre "git push", "git -C x push", "git push origin ...")
if ! printf '%s' "$CMD" | grep -Eq 'git[[:space:]].*push'; then
  exit 0 # no es push -> no interferir
fi

# Es un push: validar. Capturamos salida para reenviarla si falla.
OUT="$(cd "$ROOT" && bash scripts/prepush-validate.sh 2>&1)"
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "──────────────────────────────────────────────"
    echo "PUSH BLOQUEADO por la validación pre-push."
    echo "Corrige el error de abajo y reintenta el push."
    echo "──────────────────────────────────────────────"
    echo "$OUT" | tail -40
  } >&2
  exit 2
fi

exit 0
