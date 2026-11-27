import { expect, test } from "@playwright/test";
import { rutasProtegidas } from "../src/routes/rutas";

// La lista sale de src/routes/rutas.ts: una ruta nueva queda cubierta sola.
for (const ruta of [...rutasProtegidas, "/presupuesto/un-periodo", "/no-existe"]) {
  test(`sin sesión, ${ruta} redirige a /login`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page).toHaveURL(`/login?siguiente=${encodeURIComponent(ruta)}`);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  });
}

test("no hay registro: /registro sin sesión también pide iniciar sesión", async ({ page }) => {
  await page.goto("/registro");
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fregistro$/);
  await expect(page.getByRole("link", { name: /crear cuenta|registr/i })).toHaveCount(0);
});

test("nada se sale de la pantalla a lo ancho", async ({ page }) => {
  await page.goto("/login");
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});
