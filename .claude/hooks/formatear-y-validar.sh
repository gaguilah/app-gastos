#!/usr/bin/env sh
# Formatea y valida cada archivo que Claude edita.
# No hace nada hasta que exista package.json con Prettier/ESLint instalados (Etapa 0).
# Si ESLint encuentra errores, sale con código 2 para que Claude los vea y los corrija.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0
[ -d node_modules ] || exit 0

archivo=$(node -e '
  let d = "";
  process.stdin.on("data", c => (d += c)).on("end", () => {
    try { const j = JSON.parse(d); process.stdout.write(j.tool_input?.file_path ?? ""); } catch {}
  });
')
[ -n "$archivo" ] && [ -f "$archivo" ] || exit 0

case "$archivo" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.html)
    [ -x node_modules/.bin/prettier ] && node_modules/.bin/prettier --write --log-level warn "$archivo" >/dev/null 2>&1
    ;;
esac

case "$archivo" in
  *.ts|*.tsx|*.js|*.jsx)
    if [ -x node_modules/.bin/eslint ]; then
      salida=$(node_modules/.bin/eslint --fix "$archivo" 2>&1) || {
        echo "ESLint encontró errores en $archivo:" >&2
        echo "$salida" >&2
        exit 2
      }
    fi
    ;;
esac

exit 0
