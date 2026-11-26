import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

const sinViolaciones = async (page: Page) => {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(r.violations).toEqual([]);
};

const esMovil = (proyecto: string) => proyecto.startsWith("movil");

for (const locale of ["es-CO", "en-US"]) {
  test.describe(`accesibilidad (${locale})`, () => {
    test.use({ locale });

    for (const ruta of ["/login", "/recuperar", "/nueva-contrasena"])
      test(`${ruta} no tiene violaciones de WCAG 2.2 AA`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale.slice(0, 2));
        await sinViolaciones(page);
      });

    test("las pantallas con sesión no tienen violaciones", async ({ page }, info) => {
      await iniciarSesion(page);
      const rutas = [
        "/",
        "/ajustes",
        "/categorias",
        "/listas",
        "/listas?lista=lugares",
        "/presupuesto",
        "/bolsas",
        "/ingresos",
        "/ahorros",
        "/ruta-que-no-existe",
        ...(esMovil(info.project.name) ? ["/mas"] : []),
      ];
      for (const ruta of rutas) {
        await page.goto(ruta);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale.slice(0, 2));
        await sinViolaciones(page);
      }
    });

    test("los diálogos de Ajustes no tienen violaciones", async ({ page }) => {
      await iniciarSesion(page, "/ajustes");
      await page.getByRole("button", { name: /Idioma|Language/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await sinViolaciones(page);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /Cerrar sesión|Sign out/ }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await sinViolaciones(page);
    });

    test("los menús y formularios de Categorías y Listas no tienen violaciones", async ({
      page,
    }) => {
      await iniciarSesion(page, "/categorias");
      await page
        .getByRole("button", { name: /Acciones de «Alimentación»|Actions for “Alimentación”/ })
        .click();
      await expect(page.getByRole("menu").or(page.getByRole("dialog"))).toBeVisible();
      await sinViolaciones(page);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /Nueva categoría|New category/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await sinViolaciones(page);

      await page.goto("/listas?lista=lugares");
      await page.getByRole("button", { name: /^(Agregar|Add)$/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await sinViolaciones(page);
    });

    test("los formularios de Presupuesto, Bolsas, Ingresos y Ahorros no tienen violaciones", async ({
      page,
    }) => {
      await iniciarSesion(page);
      for (const [ruta, boton] of [
        ["/presupuesto", /^(Ajustar este período|Adjust this period)$/],
        ["/bolsas", /^(Nueva bolsa|New wallet)$/],
        ["/ingresos", /^(Registrar ingreso|Log income)$/],
        ["/ahorros", /^(Nueva meta|New goal)$/],
      ] as const) {
        await page.goto(ruta);
        await page.getByRole("button", { name: boton }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await sinViolaciones(page);
      }
    });

    test("la franja sin conexión no tiene violaciones", async ({ page, context }) => {
      await page.goto("/login");
      await context.setOffline(true);
      await expect(page.locator("[data-franja-sin-conexion]")).toBeVisible();
      await sinViolaciones(page);
    });
  });
}
