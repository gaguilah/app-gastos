#!/usr/bin/env bash
# Decide si Netlify construye este commit, para ahorrar créditos.
# Netlify: exit 0 = NO construir (ignorar); exit 1 = construir.
#
# - Producción (main): construye solo si cambió algo que afecta la app publicada.
# - Versión de prueba (PR): construye solo si además el último commit pide "[preview]".
#   El CI de GitHub Actions corre todas las pruebas en cada push, con o sin preview.
set -u

archivos_app=(src public index.html package.json package-lock.json vite.config.ts
  tsconfig.json tsconfig.app.json tsconfig.node.json netlify.toml .nvmrc)

desde="${CACHED_COMMIT_REF:-}"
hasta="${COMMIT_REF:-HEAD}"

# Versión de prueba: solo si el último commit la pide.
if [ "${CONTEXT:-}" = "deploy-preview" ] && ! git log -1 --format=%B "$hasta" | grep -qF "[preview]"; then
  echo "netlify-ignore: versión de prueba sin [preview] en el último commit; no se construye."
  exit 0
fi

# Sin referencia anterior (primer build o reintento manual): construir.
if [ -z "$desde" ] || [ "$desde" = "$hasta" ] || ! git cat-file -e "$desde^{commit}" 2>/dev/null; then
  echo "netlify-ignore: sin build anterior comparable; se construye."
  exit 1
fi

if git diff --quiet "$desde" "$hasta" -- "${archivos_app[@]}"; then
  echo "netlify-ignore: no cambió nada de la app desde $desde; no se construye."
  exit 0
fi

echo "netlify-ignore: cambió la app (${CONTEXT:-producción}); se construye."
exit 1
