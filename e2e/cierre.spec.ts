import { expect, test, type Page } from "@playwright/test";
import { bolsaDePrueba, clienteUsuario, elegirAccion, esperarSaldo, marca } from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

// Octubre de supabase/seed.sql: salario 4.000.000 con 3.000.000 al presupuesto y 2.500.000 gastados.
// Las corridas en paralelo destinan solo del salario y a su propia bolsa; el presupuesto lo toca una
// sola prueba (en un solo proyecto) para que los totales no choquen.
async function abrirCierreOctubre(page: Page) {
  await iniciarSesion(page, "/presupuesto");
  await page.getByRole("link", { name: "Ver el cierre de 1 – 31 oct 2026" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cierre del período" })).toBeVisible();
}

test.describe("Cierre del período", () => {
  test("informa por separado el sobrante del salario, el del presupuesto y las bolsas", async ({
    page,
  }) => {
    await abrirCierreOctubre(page);
    await expect(page.getByText(/^Cerrado (de nuevo )?el /)).toBeVisible();
    const salario = page.getByRole("region", { name: "Sobrante del salario" });
    await expect(salario).toContainText("$1.000.000");
    await expect(salario).toContainText("Salario $4.000.000 − $3.000.000 al presupuesto");
    await expect(page.getByRole("region", { name: "Sobrante del presupuesto" })).toContainText(
      "No destinado",
    );
    await expect(page.getByRole("region", { name: "Disponible en cada bolsa" })).toContainText(
      "Efectivo",
    );
  });

  test("destinar del salario a una bolsa, editarlo y quitarlo", async ({ page }) => {
    const bolsa = `Ahorro ${marca()}`;
    await bolsaDePrueba(bolsa);
    await abrirCierreOctubre(page);

    await page.getByRole("button", { name: "Destinar" }).click();
    const dialogo = page.getByRole("dialog", { name: "Destinar sobrante" });
    await dialogo.getByText("Del salario", { exact: true }).click();
    await dialogo.getByRole("combobox", { name: "Destino 1" }).selectOption({ label: bolsa });
    await dialogo.getByLabel("Valor del destino 1").fill("1000");
    await dialogo.getByRole("button", { name: "Destinar" }).click();
    await expect(dialogo).toBeHidden();
    const destinos = page.getByRole("region", { name: "Destinos" });
    const fila = destinos.locator("li").filter({ hasText: bolsa });
    await expect(fila).toContainText("Del salario");
    await expect(fila).toContainText("$1.000");
    await esperarSaldo(page, bolsa, "$1.000");

    await page.goBack();
    await (await elegirAccion(page, bolsa, "Editar valor")).click();
    const editar = page.getByRole("dialog", { name: "Editar destino" });
    await editar.getByLabel(`Valor destinado a ${bolsa}`).fill("2500");
    await editar.getByRole("button", { name: "Guardar" }).click();
    await expect(editar).toBeHidden();
    await expect(fila).toContainText("$2.500");

    await (await elegirAccion(page, bolsa, "Quitar destino")).click();
    const quitar = page.getByRole("alertdialog", { name: "¿Quitar este destino?" });
    await expect(quitar).toContainText(`$2.500 sale de ${bolsa}`);
    await quitar.getByRole("button", { name: "Quitar" }).click();
    await expect(fila).toHaveCount(0);
    await esperarSaldo(page, bolsa, "$0");
  });

  test("no deja destinar más de lo que sobra", async ({ page }) => {
    await abrirCierreOctubre(page);
    await page.getByRole("button", { name: "Destinar" }).click();
    const dialogo = page.getByRole("dialog", { name: "Destinar sobrante" });
    await dialogo.getByText("Del salario", { exact: true }).click();
    await dialogo.getByRole("combobox", { name: "Destino 1" }).selectOption({ label: "Efectivo" });
    await dialogo.getByLabel("Valor del destino 1").fill("9000000");
    await expect(dialogo).toContainText(/Te pasas por \$[\d.]+ de lo que sobra\./);
  });

  test("volver a cerrar guarda la fecha del último cierre", async ({ page }) => {
    await abrirCierreOctubre(page);
    await page.getByRole("button", { name: "Volver a cerrar" }).click();
    await expect(page.getByText("Listo, el cierre quedó al día.")).toBeVisible();
    await expect(page.getByText(/^Cerrado de nuevo el /)).toBeVisible();
  });

  test("un gasto atrasado después de destinar deja el sobrante en negativo y se advierte", async ({
    page,
  }, info) => {
    // Cambia los totales del presupuesto de octubre: un solo proyecto.
    test.skip(info.project.name !== "computador", "Cambia datos compartidos de octubre");
    const bolsa = `Atrasado ${marca()}`;
    await bolsaDePrueba(bolsa);
    await abrirCierreOctubre(page);
    const presupuesto = page.getByRole("region", { name: "Sobrante del presupuesto" });
    const noDestinado = presupuesto
      .getByText("No destinado")
      .locator("xpath=following-sibling::dd");
    const resto = Number((await noDestinado.textContent())!.replace(/\D/g, ""));
    expect(resto).toBeGreaterThan(0);

    // Destina todo lo que queda del presupuesto.
    await page.getByRole("button", { name: "Destinar" }).click();
    const dialogo = page.getByRole("dialog", { name: "Destinar sobrante" });
    await dialogo.getByText("Del presupuesto", { exact: true }).click();
    await dialogo.getByRole("combobox", { name: "Destino 1" }).selectOption({ label: bolsa });
    await dialogo.getByLabel("Valor del destino 1").fill(String(resto));
    await expect(dialogo).toContainText("Queda sin destinar: $0");
    await dialogo.getByRole("button", { name: "Destinar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(noDestinado).toHaveText("$0");

    // Gasto atrasado en octubre (el formulario de gasto llega en la Etapa 7).
    const db = await clienteUsuario();
    const categoria = await db
      .from("categorias")
      .select("id")
      .eq("nombre", "Alimentación")
      .single();
    const medio = await db.from("formas_pago").select("id").eq("nombre", "Débito").single();
    const gasto = await db
      .from("gastos")
      .insert({
        titulo: `Atrasado ${marca()}`,
        fecha: "2026-10-20",
        valor: 50_000,
        categoria_id: categoria.data!.id,
        medio_id: medio.data!.id,
      })
      .select("id")
      .single();
    if (gasto.error) throw gasto.error;
    const aviso = await db.rpc("advertencia_sobrante", { p_fecha: "2026-10-20" });
    expect(aviso.data).toBe(true);

    try {
      await page.reload();
      await expect(noDestinado).toHaveText("−$50.000");
      await expect(presupuesto).toContainText("dejó este sobrante en negativo");
    } finally {
      await db.from("gastos").delete().eq("id", gasto.data.id);
      await (await elegirAccion(page, bolsa, "Quitar destino")).click();
      await page.getByRole("button", { name: "Quitar" }).click();
      await expect(page.getByRole("region", { name: "Destinos" })).not.toContainText(bolsa);
    }
  });
});
