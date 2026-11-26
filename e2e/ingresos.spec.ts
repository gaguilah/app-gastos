import { expect, test } from "@playwright/test";
import { bolsaDePrueba, elegirAccion, esperarSaldo, marca, registro } from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

test.describe("Ingresos", () => {
  test("a una bolsa, cambiar el destino a Presupuesto y eliminar", async ({ page }) => {
    const bolsa = `Nequi ${marca()}`;
    const titulo = `Freelance ${marca()}`;
    await bolsaDePrueba(bolsa, 62_300);
    await iniciarSesion(page, "/ingresos");

    await page.getByRole("button", { name: "Registrar ingreso" }).first().click();
    const formulario = page.getByRole("dialog", { name: "Nuevo ingreso" });
    await formulario.getByLabel("Valor").fill("350000");
    await formulario.getByLabel("Título").fill(titulo);
    await formulario.getByText("Salario", { exact: true }).click();
    await formulario.getByRole("radio", { name: new RegExp(bolsa) }).click();
    await formulario.getByRole("button", { name: "Guardar ingreso" }).click();
    await expect(registro(page, titulo)).toContainText("+$350.000");
    await esperarSaldo(page, bolsa, "$412.300");

    await page.goto("/ingresos");
    await (await elegirAccion(page, titulo, "Eliminar")).click();
    const eliminar = page.getByRole("alertdialog", { name: `¿Eliminar «${titulo}»?` });
    await expect(eliminar).toContainText(`${bolsa} baja de $412.300 a $62.300.`);
    await page.keyboard.press("Escape");

    await (await elegirAccion(page, titulo, "Editar")).click();
    const editar = page.getByRole("dialog", { name: "Editar ingreso" });
    await editar.getByRole("radio", { name: /Presupuesto del período/ }).click();
    await editar.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(editar).toBeHidden();
    await esperarSaldo(page, bolsa, "$62.300");

    await page.goto("/ingresos");
    await (await elegirAccion(page, titulo, "Eliminar")).click();
    await page.getByRole("button", { name: "Eliminar ingreso" }).click();
    await expect(registro(page, titulo)).toHaveCount(0);
  });

  test("una fecha futura se rechaza en el campo", async ({ page }) => {
    await iniciarSesion(page, "/ingresos");
    await page.getByRole("button", { name: "Registrar ingreso" }).first().click();
    const formulario = page.getByRole("dialog", { name: "Nuevo ingreso" });
    await formulario.getByLabel("Valor").fill("1000");
    await formulario.getByLabel("Título").fill("Futuro");
    await formulario.getByLabel("Fecha").fill("2099-01-01");
    await formulario.getByRole("button", { name: "Guardar ingreso" }).click();
    await expect(formulario).toContainText("La fecha no puede ser futura.");
    // Solo categorías de ingreso.
    await expect(formulario.getByText("Alimentación", { exact: true })).toHaveCount(0);
  });
});
