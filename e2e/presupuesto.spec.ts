import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

// Solo vistas previas y guardados sin cambios: el presupuesto es de todo el usuario y las corridas
// en paralelo lo cambiarían a la vez.
test.describe("Presupuesto y período", () => {
  test("el período en curso muestra el desglose del presupuesto", async ({ page }) => {
    await iniciarSesion(page, "/presupuesto");
    const enCurso = page.getByRole("region", { name: "Período en curso" });
    for (const texto of [
      "Del salario",
      "Ingresos que suman",
      "Presupuesto",
      "Gastado",
      "Disponible",
    ])
      await expect(enCurso).toContainText(texto);
    await expect(enCurso).toContainText(/\d+ %/);
  });

  test("cambiar el día de inicio muestra el período actual y el siguiente", async ({ page }) => {
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: "Cambiar día de inicio" }).click();
    const dialogo = page.getByRole("dialog", { name: "Día de inicio del período" });
    await dialogo.getByText("Día 15", { exact: true }).click();
    await expect(dialogo).toContainText("Período actual");
    await expect(dialogo).toContainText(/Siguiente.*– 14 /);
  });

  test("el salario base valida el monto al presupuesto", async ({ page }) => {
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: /^(Configurar|Cambiar) salario$/ }).click();
    const dialogo = page.getByRole("dialog", { name: "Salario base" });
    await dialogo.getByLabel("Salario del período").fill("1000000");
    await dialogo.getByLabel("Para el presupuesto").fill("2000000");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo).toContainText("Escribe un monto de $0 hasta el salario.");
  });

  test("guardar el salario base funciona con la API real", async ({ page }) => {
    // Supabase carga safeupdate en la API: un UPDATE sin WHERE falla (error del 26-nov-2026).
    // Se guarda $0 sin tocar el período actual, como en supabase/seed.sql.
    await iniciarSesion(page, "/presupuesto");
    await page.getByRole("button", { name: /^(Configurar|Cambiar) salario$/ }).click();
    const dialogo = page.getByRole("dialog", { name: "Salario base" });
    await dialogo.getByLabel("Salario del período").fill("0");
    await dialogo.getByLabel("Para el presupuesto").fill("0");
    await expect(dialogo.getByRole("checkbox")).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Listo, quedó guardado.")).toBeVisible();
    await expect(dialogo).toBeHidden();
  });
});
