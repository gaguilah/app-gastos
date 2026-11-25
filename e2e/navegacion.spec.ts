import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

const esMovil = (proyecto: string) => proyecto.startsWith("movil");

test("navega con el menú de su tamaño y marca el destino activo", async ({ page }, info) => {
  await iniciarSesion(page);
  const menus = page.getByRole("navigation", { name: "Principal" });
  await expect(menus).toHaveCount(1); // el del otro tamaño está oculto

  if (esMovil(info.project.name)) {
    const barra = menus;
    for (const nombre of ["Inicio", "Gastos", "Registrar", "Reportes", "Más"])
      await expect(barra.getByRole("link", { name: nombre })).toBeVisible();
    await barra.getByRole("link", { name: "Más" }).click();
    await expect(page.getByRole("navigation", { name: "Más" }).getByRole("link")).toHaveCount(10);
    await page.getByRole("link", { name: "Bolsas" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bolsas" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Más" })).toHaveAttribute("aria-current", "page");
  } else {
    const lateral = menus;
    await lateral.getByRole("link", { name: "Bolsas" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bolsas" })).toBeVisible();
    await expect(lateral.getByRole("link", { name: "Bolsas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // «Más» solo existe en el móvil.
    await page.goto("/mas");
    await expect(page).toHaveURL("/");
  }
});

test("el menú lateral se pliega en tablet y muestra el texto en computador", async ({
  page,
}, info) => {
  test.skip(esMovil(info.project.name), "En móvil no hay menú lateral");
  await iniciarSesion(page);
  const enlace = page.getByRole("navigation", { name: "Principal" }).getByRole("link", {
    name: "Ingresos",
  });
  const caja = await enlace.boundingBox();
  if (info.project.name === "tablet") {
    expect(caja?.width).toBeLessThanOrEqual(48);
    await enlace.hover();
    await expect(page.getByRole("tooltip", { name: "Ingresos" })).toBeVisible();
  } else {
    expect(caja?.width).toBeGreaterThan(48);
    await expect(enlace).toHaveText("Ingresos");
  }
});

test("las áreas táctiles del menú miden al menos 44 px", async ({ page }) => {
  await iniciarSesion(page);
  for (const enlace of await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link")
    .all()) {
    const caja = await enlace.boundingBox();
    expect(caja?.height).toBeGreaterThanOrEqual(44);
    expect(caja?.width).toBeGreaterThanOrEqual(44);
  }
});

test("nada se sale de la pantalla a lo ancho", async ({ page }) => {
  await iniciarSesion(page, "/gastos");
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});
