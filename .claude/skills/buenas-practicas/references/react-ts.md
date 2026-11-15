# React + TypeScript

Versiones del stack en la tabla "Stack" de `CLAUDE.md` (React 19, Tailwind 4, TypeScript 6). Las herramientas marcadas como propuestas se confirman en la Etapa 0.

## TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`. Sin `any`; si un tipo es desconocido, `unknown` y se valida.
- Tipos de la base de datos generados con `supabase gen types typescript --local` en `src/datos/database.types.ts`. No se escriben a mano.
- Los datos que vienen de fuera (formularios, QR, respuestas de red) se validan en el borde con un esquema (por ejemplo, Zod) y dentro ya se confía en el tipo.
- Tipos de dominio con nombres del negocio en español: `Gasto`, `Bolsa`, `Periodo`, `ReglaPeriodica`. Tipo `Pesos = number` (entero) como alias documentado.
- Uniones discriminadas para estados: `{ estado: "pendiente" } | { estado: "confirmado"; confirmadoEn: string }`.

## React 19
- Componentes de función, pequeños, un archivo por componente exportado.
- `ref` se pasa como prop normal; no uses `forwardRef` en componentes nuevos. Los componentes de shadcn ya siguen esta convención.
- No uses APIs retiradas en React 19 (`propTypes`, `defaultProps` en funciones, `ReactDOM.render`).
- Datos del servidor con una librería de caché de consultas (por ejemplo, TanStack Query): nada de `useEffect` + `fetch` a mano. Estado global solo para preferencias de UI.
- Formularios con React Hook Form + el esquema de validación, usando los componentes `Form` de shadcn.
- Las mutaciones invalidan las consultas que afectan (registrar un gasto invalida el gasto del período y el saldo de la bolsa).
- Actualización en tiempo real entre dispositivos (6 · PWA) con Supabase Realtime en las tablas necesarias, invalidando la caché; no dupliques la lógica de cálculo en el listener.
- Errores: un `ErrorBoundary` por sección y mensajes traducidos; nunca mostrar el error crudo de Supabase al usuario.

## Rutas (React Router 8, modo librería)
- `createBrowserRouter` + `RouterProvider`, definidos en `src/routes/`. No se usa el modo framework (`@react-router/dev`, `react-router.config.ts`).
- Estructura:
  ```
  /login                 pública (única)
  /                      RutaProtegida → LayoutApp (navegación + encabezado + <Outlet/>)
    index                Panel
    gastos, ingresos, bolsas, periodicos, prestamos, deudas, categorias, reportes, ajustes…
  *                      No encontrada (también protegida)
  ```
- **Protección centralizada**: un solo elemento padre (`RutaProtegida`, o un `loader` en la ruta raíz) revisa la sesión de Supabase y, sin sesión, redirige a `/login?siguiente=<ruta pedida>`. Ninguna pantalla repite la verificación.
- Tras iniciar sesión se navega a `siguiente` solo si es una ruta interna (empieza por `/` y no por `//`), para no abrir una redirección a otro sitio.
- Si el usuario ya tiene sesión y abre `/login`, se le lleva al panel.
- Al cerrar sesión o vencer la sesión (`onAuthStateChange`), se limpia la caché de datos y se vuelve a `/login`.
- Cada pantalla se carga de forma diferida con la propiedad `lazy` de la ruta, para que la PWA abra rápido en el móvil.
- La protección en el frontend es solo de experiencia de uso: la seguridad real está en RLS.

## Autenticación (un solo usuario)
- Solo inicio de sesión con correo y contraseña (`signInWithPassword`). **No existe registro**: ninguna ruta, pantalla, enlace ni llamada a `signUp`.
- Los registros se desactivan en Supabase Auth (ver `supabase-rls-migraciones.md`, "Auth").
- La recuperación de contraseña se decide en la especificación de la Etapa 4.

## Estilo
- ESLint + Prettier, sin reglas desactivadas por archivo sin un comentario que explique por qué.
- Nombres: código y comentarios en español para el dominio (`calcularPeriodo`, `saldoBolsa`); términos técnicos de React/TS en inglés cuando son convención (`useQuery`, `props`).
- Importaciones con alias `@/`.
- Sin código comentado ni `console.log` en el código entregado.

## PWA
- `vite-plugin-pwa` (o equivalente) con manifiesto completo (nombre, íconos, `display: standalone`, colores desde los tokens).
- Estrategia de actualización explícita: al haber versión nueva, aviso al usuario para recargar (6 · PWA).
- Aviso de sin conexión visible; las escrituras sin conexión no se pierden en silencio (o se bloquean con aviso claro, según lo que diga la especificación).
- Web Push: la suscripción se guarda en la tabla de suscripciones con RLS; en iPhone solo con la app instalada, y la UI lo explica.
