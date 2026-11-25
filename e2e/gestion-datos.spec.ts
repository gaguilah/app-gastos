import { expect, test } from "@playwright/test";
import { elegirAccion, lugarConGasto, marca } from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

test.describe("Categorías", () => {
  test("crear con subcategoría y luego borrarla sin movimientos", async ({ page }) => {
    const nombre = `${marca()} Mascotas`;
    await iniciarSesion(page, "/categorias");
    await page.getByRole("button", { name: "Nueva categoría" }).click();
    const formulario = page.getByRole("dialog", { name: "Nueva categoría" });
    await formulario.getByLabel("Nombre", { exact: true }).fill(nombre);
    await formulario.getByRole("button", { name: "Mascota", exact: true }).click();
    await formulario.getByLabel("Nueva subcategoría").fill("Veterinario");
    await formulario.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(formulario.getByText(nombre)).toBeVisible(); // vista previa
    await formulario.getByRole("button", { name: "Guardar categoría" }).click();

    await expect(page.getByText("Categoría creada")).toBeVisible();
    await expect(page.getByText(nombre, { exact: true })).toBeVisible();
    await expect(page.getByText("Veterinario").first()).toBeVisible();

    await (await elegirAccion(page, nombre, /^Eliminar/)).click();
    const confirmar = page.getByRole("alertdialog", { name: `¿Borrar «${nombre}»?` });
    await expect(confirmar).toContainText("Sus subcategorías también se borran.");
    await confirmar.getByRole("button", { name: "Borrar categoría" }).click();
    await expect(page.getByText("Categoría borrada")).toBeVisible();
    await expect(page.getByText(nombre, { exact: true })).toHaveCount(0);
  });

  test("una del sistema se edita pero no se elimina", async ({ page }) => {
    await iniciarSesion(page, "/categorias");
    const eliminar = await elegirAccion(page, "Gasto desconocido", /^Eliminar/);
    await expect(eliminar).toContainText("Del sistema: no se puede eliminar");
    await expect(eliminar).toBeDisabled();
  });

  test("las pestañas filtran por tipo y se recuerdan en la dirección", async ({ page }) => {
    await iniciarSesion(page, "/categorias");
    await page.getByRole("tab", { name: /^Ingreso/ }).click();
    await expect(page).toHaveURL(/tipo=ingreso/);
    await expect(page.getByText("Salario", { exact: true })).toBeVisible();
    await expect(page.getByText("Alimentación", { exact: true })).toHaveCount(0);
  });
});

test.describe("Formas de pago, lugares y personas", () => {
  test("agregar un lugar repetido no crea otro", async ({ page }) => {
    const nombre = `Éxito ${marca()}`;
    await iniciarSesion(page, "/listas?lista=lugares");
    for (const escrito of [nombre, `  ${nombre.toLowerCase().replace("é", "e")} `]) {
      await page.getByRole("button", { name: "Agregar", exact: true }).click();
      const dialogo = page.getByRole("dialog", { name: "Agregar a la lista" });
      await dialogo.getByLabel("Nombre").fill(escrito);
      await dialogo.getByRole("button", { name: "Agregar" }).click();
      if (escrito === nombre) await expect(dialogo).toBeHidden();
    }
    const dialogo = page.getByRole("dialog", { name: "Agregar a la lista" });
    await expect(dialogo).toContainText(`«${nombre}» ya está en la lista`);
    await dialogo.getByRole("button", { name: "Usar el existente" }).click();
    await expect(page.getByText(nombre, { exact: true })).toHaveCount(1);
  });

  test("dos lugares parecidos: aviso de duplicado, Revisar y unir", async ({ page }) => {
    const base = `${marca()} D1`;
    await lugarConGasto(base);
    await lugarConGasto(`${base} Alto`);
    await iniciarSesion(page, "/listas?lista=lugares");
    // El par llega en cualquier orden.
    const aviso = page
      .getByRole("status")
      .filter({ hasText: `«${base}»` })
      .filter({ hasText: `«${base} Alto»` });
    await aviso.getByRole("button", { name: "Revisar" }).click();
    const unir = page.getByRole("alertdialog", { name: /^Unir «/ });
    await expect(unir).toContainText("Esto no se puede deshacer.");
    await unir.getByRole("button", { name: "Unir", exact: true }).click();
    await expect(page.getByText(/^Unidos en/)).toBeVisible();
    await expect(page.getByText(new RegExp(`^${base}( Alto)?$`))).toHaveCount(1);
    await expect(aviso).toHaveCount(0);
  });

  test("«No son el mismo» quita el aviso para siempre", async ({ page }) => {
    const base = `${marca()} Cine`;
    await lugarConGasto(base);
    await lugarConGasto(`${base} Norte`);
    await iniciarSesion(page, "/listas?lista=lugares");
    const aviso = page
      .getByRole("status")
      .filter({ hasText: `«${base}»` })
      .filter({ hasText: `«${base} Norte»` });
    await aviso.getByRole("button", { name: "Revisar" }).click();
    await page.getByRole("button", { name: "No son el mismo" }).click();
    await expect(aviso).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(`${base} Norte`, { exact: true })).toBeVisible();
    await expect(aviso).toHaveCount(0);
  });

  test("eliminar un lugar en uso lo archiva y deja de aparecer", async ({ page }) => {
    const nombre = `${marca()} Terpel`;
    await lugarConGasto(nombre);
    await iniciarSesion(page, "/listas?lista=lugares");
    await (await elegirAccion(page, nombre, "Eliminar")).click();
    const confirmar = page.getByRole("alertdialog", { name: `¿Eliminar «${nombre}»?` });
    await expect(confirmar).toContainText("lo conserva en el historial");
    await confirmar.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Archivado: el historial lo conserva")).toBeVisible();
    await expect(page.getByText(nombre, { exact: true })).toHaveCount(0);
  });

  test("una persona con número de tarjeta se rechaza", async ({ page }) => {
    await iniciarSesion(page, "/listas?lista=personas");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const dialogo = page.getByRole("dialog", { name: "Agregar a la lista" });
    await dialogo.getByLabel("Nombre").fill("Visa 4111 1111 1111 1111");
    await dialogo.getByRole("button", { name: "Agregar" }).click();
    await expect(dialogo).toContainText("No guardamos números de tarjeta");
  });

  test("formas de pago: sin bolsas y con el aviso de dónde están", async ({ page }) => {
    await iniciarSesion(page, "/listas");
    await expect(page.getByText(/se manejan en Bolsas/)).toBeVisible();
    await expect(page.getByText("Efectivo", { exact: true })).toHaveCount(0);
  });
});
