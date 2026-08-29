#!/usr/bin/env bash
# ------------------------------------------------------------
# deployment-manager.sh
# Wrapper simple para ejecutar el script TypeScript de gestión
# (deployment-manager.ts) desde la línea de comandos.
# ------------------------------------------------------------

# Directorio del script (asume que está en la misma carpeta "tools")
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TS_SCRIPT="$SCRIPT_DIR/deployment-manager.ts"

# Verifica que ts-node o npx estén disponibles
if command -v ts-node >/dev/null 2>&1; then
  EXEC="ts-node"
else
  # Usa npx como fallback (instala ts-node temporalmente)
  EXEC="npx ts-node"
fi

# Ejecuta el script TypeScript
if [[ -f "$TS_SCRIPT" ]]; then
  echo "Ejecutando deployment-manager..."
  $EXEC "$TS_SCRIPT"
else
  echo "Error: No se encontró $TS_SCRIPT"
  exit 1
fi
