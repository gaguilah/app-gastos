# Configuración que hace Giovanni a mano

Pasos que Claude no puede hacer desde su entorno. Se hacen una sola vez.

## 1. Netlify: publicación y versión de prueba por PR

1. En [app.netlify.com](https://app.netlify.com), **Add new project → Import an existing project → GitHub** y elige `gaguilah/app-gastos`.
2. Netlify lee `netlify.toml`: build `npm run build`, carpeta `dist`, Node de `.nvmrc`. No cambies nada en el formulario.
3. **Branch to deploy:** `main` (producción). Como solo Giovanni fusiona a `main`, cada fusión es su aprobación para publicar.
4. En **Project configuration → Build & deploy → Branches and deploy contexts**, deja **Deploy Previews: Any pull request against your production branch**. Así cada PR trae su enlace de prueba.
5. Variables de entorno: ninguna por ahora. En la Etapa 4 se agregan `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (solo la clave pública, nunca la `service_role`).

## 2. Tablero Kanban en GitHub Projects

1. En GitHub, **tu perfil → Projects → New project → Board**. Nombre: "App-Gastos".
2. Columnas (campo *Status*): **Por hacer, Especificando, En desarrollo, En revisión, Cerrado**.
3. En **Settings → Manage access** del proyecto o desde el repo (**Projects → Link a project**), enlázalo con `gaguilah/app-gastos`.
4. Agrega el issue de la etapa en curso y muévelo de columna según avance.

## 3. Proteger `main` con los checks del CI

Hazlo después de que el CI haya corrido una vez en un PR (GitHub solo deja elegir checks que ya existen).

1. Repo → **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre "Proteger main", **Enforcement status: Active**.
3. **Target branches → Add target → Include default branch**.
4. Reglas:
   - **Restrict deletions** y **Block force pushes**.
   - **Require a pull request before merging**, con **Required approvals: 0** (con un solo usuario no puedes aprobar tus propios PR).
   - **Require status checks to pass**, con **Require branches to be up to date**, y agrega `estatica`, `unitarias`, `base-de-datos` y `e2e`.
5. **Bypass list** vacía y **Create**.

Los rulesets se cumplen en repos públicos con GitHub Free; en uno privado hace falta GitHub Pro.

## 4. Supabase real

Ya hecho el 15-nov-2026: proyecto `app-gastos` creado, usuario creado a mano y registros desactivados. No se enlaza ni recibe migraciones hasta que Giovanni las apruebe.
