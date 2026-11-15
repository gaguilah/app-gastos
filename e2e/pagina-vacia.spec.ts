import { expect, test } from "@playwright/test";

test("muestra la página vacía en español por defecto", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "App-Gastos" })).toBeVisible();
  await expect(page.getByText("Estamos preparando tu app de gastos.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test.describe("con el navegador en inglés", () => {
  test.use({ locale: "en-US" });

  test("muestra la página vacía en inglés", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("We are getting your expense app ready.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test("nada se sale de la pantalla a lo ancho", async ({ page }) => {
  await page.goto("/");
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});
