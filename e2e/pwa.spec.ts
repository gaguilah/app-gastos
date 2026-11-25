import { expect, test, type Page } from "@playwright/test";
import { servirBuild } from "./apoyo/servidor";

// Espera a que el service worker termine de activarse (ready llega aún en "activating").
const swListo = (page: Page) =>
  page.evaluate(async () => {
    const activo = (await navigator.serviceWorker.ready).active!;
    if (activo.state !== "activated")
      await new Promise((listo) => activo.addEventListener("statechange", listo, { once: true }));
    return activo.state;
  });

test("sin red aparece la franja, el envío se deshabilita y al volver la señal se oculta", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  const entrar = page.getByRole("button", { name: "Iniciar sesión" });
  await expect(entrar).toBeEnabled();

  await context.setOffline(true);
  await expect(page.getByText("Sin conexión.")).toBeVisible();
  await expect(entrar).toBeDisabled();

  await context.setOffline(false);
  await expect(page.getByText("Sin conexión.")).toBeHidden();
  await expect(entrar).toBeEnabled();
});

test("el manifiesto permite instalar la app", async ({ request }) => {
  const manifiesto = await (await request.get("/manifest.webmanifest")).json();
  expect(manifiesto).toMatchObject({
    name: "App-Gastos",
    start_url: "/",
    display: "standalone",
  });
  const tamanos = manifiesto.icons.map((i: { sizes: string; purpose?: string }) =>
    [i.sizes, i.purpose ?? "any"].join(" "),
  );
  expect(tamanos).toEqual(
    expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]),
  );
  for (const icono of manifiesto.icons) expect((await request.get(icono.src)).ok()).toBe(true);
});

test.describe("service worker", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Se prueba en Chromium");

  test("abre sin red con lo que quedó guardado", async ({ page, context }) => {
    await page.goto("/login");
    expect(await swListo(page)).toBe("activated");
    await page.reload(); // desde aquí la página la controla el service worker
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("Sin conexión.")).toBeVisible();
  });

  test("avisa la versión nueva y solo carga al tocar Actualizar", async ({ page }) => {
    const build = await servirBuild();
    try {
      await page.goto(`${build.url}/login`);
      expect(await swListo(page)).toBe("activated");

      build.publicar();
      await page.evaluate(async () => (await navigator.serviceWorker.ready).update());

      const aviso = page.getByText("Hay una versión nueva");
      await expect(aviso).toBeVisible();
      // No recarga sola: lo que se estaba escribiendo sigue ahí.
      await page.getByLabel("Correo").fill("borrador@prueba.local");
      await expect(page.getByLabel("Correo")).toHaveValue("borrador@prueba.local");

      const recarga = page.waitForEvent("load");
      await page.getByRole("button", { name: "Actualizar" }).click();
      await recarga;
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
      await expect(page.getByLabel("Correo")).toHaveValue("");
      await expect(aviso).toBeHidden();
    } finally {
      await build.cerrar();
    }
  });
});
