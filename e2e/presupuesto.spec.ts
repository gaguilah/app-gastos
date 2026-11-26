import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

// Solo vistas previas: el presupuesto del período es de todo el usuario y las corridas en
// paralelo lo cambiarían a la vez.
test.describe("Presupuesto y período", () => {
  test("ajustar este período muestra el resultado antes de aplicar", async ({ page }) => {
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: "Ajustar este período" }).first().click();
    const dialogo = page.getByRole("dialog", { name: /^Ajustar el período/ });
    await dialogo.getByLabel("Ajuste").fill("200000");
    await expect(dialogo).toContainText("Con el ajuste");
    await expect(dialogo).toContainText(/Quedarías en \d+ % gastado/);
  });

  test("cambiar el día de inicio muestra el período actual y el siguiente", async ({ page }) => {
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: "Cambiar día de inicio" }).click();
    const dialogo = page.getByRole("dialog", { name: "Día de inicio del período" });
    await dialogo.getByText("Día 15", { exact: true }).click();
    await expect(dialogo).toContainText("Período actual");
    await expect(dialogo).toContainText(/Siguiente.*– 14 /);
  });

  test("el presupuesto por defecto ofrece usarlo también en el período actual", async ({
    page,
  }) => {
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: "Cambiar presupuesto por defecto" }).click();
    const dialogo = page.getByRole("dialog", { name: "Presupuesto por defecto" });
    await expect(dialogo).toContainText("El período actual no cambia.");
    await expect(
      dialogo.getByRole("checkbox", { name: "Usar también en el período actual" }),
    ).not.toBeChecked();
  });
});
