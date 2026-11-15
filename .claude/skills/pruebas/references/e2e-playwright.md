# E2E, accesibilidad e idiomas con Playwright

## Configuración (Etapa 0)

`playwright.config.ts` con un proyecto por tamaño (los mismos de `diseno-ui/references/layouts-3-tamanos.md`):

```ts
projects: [
  { name: "movil",      use: { ...devices["iPhone 14"] } },
  { name: "movil-android", use: { ...devices["Pixel 7"] } },
  { name: "tablet",     use: { ...devices["iPad Air"] } },
  { name: "computador", use: { viewport: { width: 1440, height: 900 } } },
],
use: { locale: "es-CO", timezoneId: "America/Bogota", trace: "off" },
```

- Corre contra el servidor local de la app y Supabase local, con la semilla recién aplicada.
- Reloj fijo con `page.clock.setFixedTime(new Date("2026-03-10T12:00:00-05:00"))` en cada prueba que dependa de la fecha; avanza el tiempo con `page.clock` para probar periódicos y cuotas.
- Selectores por rol y etiqueta (`getByRole("button", { name: … })`), nunca por clases CSS.
- Un usuario de prueba por archivo de pruebas para que puedan correr en paralelo.

## Recorridos mínimos (crecen por etapa)

- Login, cierre de sesión y sesión vencida (ver "Rutas protegidas" abajo).
- Registrar un gasto con origen en bolsa → el disponible del período y el saldo de la bolsa bajan lo mismo (Etapa 7).
- Ingreso con destino presupuesto y con destino bolsa (Etapa 6).
- Crear un periódico → avanzar la fecha → aparece pendiente → confirmarlo ajustando el valor → se descuenta (Etapa 8).
- Préstamo con pago parcial y cierre de período con pendiente por cobrar (Etapa 9).
- Escanear una factura de ejemplo llena fecha y valor (Etapa 10; la imagen se inyecta con `setInputFiles`).
- Filtros devuelven lo esperado y la exportación a Excel trae las mismas filas (Etapa 11).

En móvil se navega con la barra inferior; en tablet y computador, con el menú lateral. Si un recorrido necesita pasos distintos por tamaño, usa `test.info().project.name`.

## Rutas protegidas (desde la Etapa 4)

Archivo `e2e/rutas-protegidas.spec.ts`. Corre en los tres tamaños.

- **Sin sesión, toda ruta protegida redirige a `/login`.** Recorre la lista de rutas exportada desde `src/routes/` (no una lista copiada a mano), para que una ruta nueva quede cubierta sola:
  ```ts
  import { rutasProtegidas } from "../src/routes/rutas";

  for (const ruta of rutasProtegidas) {
    test(`sin sesión, ${ruta} redirige a /login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(`/login\\?siguiente=${encodeURIComponent(ruta)}`));
      await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    });
  }
  ```
- Una ruta inexistente sin sesión también redirige a `/login`.
- Tras iniciar sesión desde `/login?siguiente=/gastos`, se llega a `/gastos`.
- `siguiente` con un destino externo (`//sitio.com`, `https://sitio.com`) se ignora y lleva al panel.
- Con sesión, abrir `/login` lleva al panel.
- Cerrar sesión y luego ir atrás en el navegador no muestra datos: redirige a `/login`.
- **No hay registro**: la pantalla de login no tiene enlace ni botón para crear cuenta, y `/registro` (o `/signup`) no existe.
- Con la clave pública, `supabase.auth.signUp(...)` contra Supabase local devuelve error (registros desactivados en `config.toml`). Esta prueba puede vivir en Vitest como prueba de integración.

## Accesibilidad

```ts
import AxeBuilder from "@axe-core/playwright";
const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
expect(r.violations).toEqual([]);
```

- Se corre en cada pantalla principal, en los tres tamaños.
- Para revisión de diseño, además: `npx impeccable detect http://localhost:5173/<ruta>` (contraste, texto pequeño y patrones de diseño pobre).

## Idiomas

- Prueba unitaria: `es.json` y `en.json` tienen exactamente las mismas claves y ningún valor vacío.
- E2E: cambiar a inglés en una pantalla principal y verificar que no quedan textos en español (lista de palabras centinela) ni claves sin traducir (`gastos.formulario.`).
- Verificar que `document.documentElement.lang` cambia.
