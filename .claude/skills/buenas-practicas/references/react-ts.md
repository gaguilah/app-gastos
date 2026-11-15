# React + TypeScript

Las herramientas exactas (Vite, gestor de rutas, librería de datos) se fijan en la Etapa 0; estas reglas valen con cualquiera de ellas.

## TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`. Sin `any`; si un tipo es desconocido, `unknown` y se valida.
- Tipos de la base de datos generados con `supabase gen types typescript --local` en `src/datos/database.types.ts`. No se escriben a mano.
- Los datos que vienen de fuera (formularios, QR, respuestas de red) se validan en el borde con un esquema (por ejemplo, Zod) y dentro ya se confía en el tipo.
- Tipos de dominio con nombres del negocio en español: `Gasto`, `Bolsa`, `Periodo`, `ReglaPeriodica`. Tipo `Pesos = number` (entero) como alias documentado.
- Uniones discriminadas para estados: `{ estado: "pendiente" } | { estado: "confirmado"; confirmadoEn: string }`.

## React
- Componentes de función, pequeños, un archivo por componente exportado.
- Datos del servidor con una librería de caché de consultas (por ejemplo, TanStack Query): nada de `useEffect` + `fetch` a mano. Estado global solo para preferencias de UI.
- Formularios con React Hook Form + el esquema de validación, usando los componentes `Form` de shadcn.
- Las mutaciones invalidan las consultas que afectan (registrar un gasto invalida el gasto del período y el saldo de la bolsa).
- Actualización en tiempo real entre dispositivos (6 · PWA) con Supabase Realtime en las tablas necesarias, invalidando la caché; no dupliques la lógica de cálculo en el listener.
- Rutas cargadas de forma diferida (`lazy`) por sección para que la PWA abra rápido en el móvil.
- Errores: un `ErrorBoundary` por sección y mensajes traducidos; nunca mostrar el error crudo de Supabase al usuario.

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
