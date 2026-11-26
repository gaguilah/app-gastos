import { expect, test, type Page } from "@playwright/test";
import {
  bolsaDePrueba,
  clienteUsuario,
  elegirAccion,
  esperarSaldo,
  hoyBogota,
  marca,
  registro,
} from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

/** Meta con aporte mensual desde la bolsa y un aporte pendiente de hoy, como al abrir la app. */
async function metaConPendiente(nombre: string, bolsaId: string) {
  const db = await clienteUsuario();
  const hoy = hoyBogota();
  const meta = await db.rpc("crear_meta", {
    p_nombre: nombre,
    p_icono: "plane",
    p_monto: 3_000_000,
    p_fecha_final: `${Number(hoy.slice(0, 4)) + 1}${hoy.slice(4, 8)}01`,
    p_valor: 250_000,
    p_frecuencia: "mensual",
    p_dia: 1,
    p_bolsa_id: bolsaId,
  });
  if (meta.error) throw meta.error;
  const regla = await db
    .from("reglas_aporte")
    .update({ proxima_fecha: hoy })
    .eq("meta_id", meta.data as string)
    .select("id")
    .single();
  if (regla.error) throw regla.error;
  const dia = await db.rpc("ponerse_al_dia");
  if (dia.error) throw dia.error;
  return regla.data.id;
}

/** Acción del menú ⋮ de un aporte pendiente: menú flotante u hoja inferior según el tamaño. */
async function accionPendiente(page: Page, meta: string, accion: string) {
  await page.getByRole("button", { name: `Acciones del aporte a «${meta}»` }).click();
  await page
    .getByRole("menuitem", { name: accion })
    .or(
      page.getByRole("dialog", { name: `Aporte a ${meta}` }).getByRole("button", { name: accion }),
    )
    .click();
}

test.describe("Ahorros", () => {
  test("crear con aporte sugerido, aportar, retirar y eliminar con saldo", async ({ page }) => {
    const bolsa = `Nequi ${marca()}`;
    const meta = `Viaje ${marca()}`;
    await bolsaDePrueba(bolsa, 1_000_000);
    await iniciarSesion(page, "/ahorros");

    await page.getByRole("button", { name: "Nueva meta" }).first().click();
    const formulario = page.getByRole("dialog", { name: "Nueva meta de ahorro" });
    await formulario.getByLabel("Nombre").fill(meta);
    await formulario.getByLabel("Monto a alcanzar").fill("3000000");
    await expect(formulario).toContainText("Aporte sugerido: $250.000 por mes.");
    await expect(formulario).toContainText("Llegas a la meta el");
    await formulario.getByRole("radio", { name: new RegExp(bolsa) }).click();
    await formulario.getByRole("button", { name: "Crear meta" }).click();
    await expect(registro(page, meta)).toContainText("Al día");

    await (await elegirAccion(page, meta, "Registrar aporte")).click();
    const aporte = page.getByRole("dialog", { name: `Aporte a «${meta}»` });
    await aporte.getByLabel("Valor").fill("250000");
    await aporte.getByRole("radio", { name: new RegExp(bolsa) }).click();
    await aporte.getByRole("button", { name: "Registrar aporte" }).click();
    await expect(aporte).toBeHidden();
    await expect(registro(page, meta)).toContainText("$250.000");

    await (await elegirAccion(page, meta, /^Retirar/)).click();
    const retiro = page.getByRole("dialog", { name: `Retirar de «${meta}»` });
    await retiro.getByLabel("Valor").fill("300000");
    await expect(retiro).toContainText("No puedes retirar más de lo ahorrado ($250.000).");
    await retiro.getByLabel("Valor").fill("100000");
    await retiro.getByLabel("Motivo (opcional)").fill("Tiquetes");
    await retiro.getByRole("radio", { name: new RegExp(bolsa) }).click();
    await retiro.getByRole("button", { name: "Retirar" }).click();
    await expect(retiro).toBeHidden();

    // La bolsa de la meta no sale en Bolsas.
    await esperarSaldo(page, bolsa, "$850.000");
    await expect(registro(page, meta)).toHaveCount(0);

    await page.goto("/ahorros");
    await (await elegirAccion(page, meta, "Eliminar")).click();
    const eliminar = page.getByRole("alertdialog", { name: `¿Eliminar «${meta}»?` });
    await expect(eliminar).toContainText("Los $150.000 ahorrados pasan a la bolsa que elijas.");
    await eliminar.getByRole("radio", { name: new RegExp(bolsa) }).click();
    await eliminar.getByRole("button", { name: "Eliminar meta" }).click();
    await expect(registro(page, meta)).toHaveCount(0);
    await esperarSaldo(page, bolsa, "$1.000.000");
  });

  test("un pendiente se ajusta y el valor nuevo queda en la regla", async ({ page }) => {
    const bolsa = `Origen ${marca()}`;
    const meta = `Moto ${marca()}`;
    const reglaId = await metaConPendiente(meta, await bolsaDePrueba(bolsa, 500_000));
    await iniciarSesion(page, "/ahorros");
    const pendientes = page.getByRole("region", { name: "Aportes por confirmar" });
    await expect(pendientes).toContainText(`Aporte a ${meta}`);

    await accionPendiente(page, meta, "Ajustar valor y confirmar");
    const dialogo = page.getByRole("dialog", { name: "Ajustar aporte y confirmar" });
    await expect(dialogo).toContainText("La regla dice $250.000.");
    await dialogo.getByLabel("Aporte de esta vez").fill("300000");
    await dialogo.getByRole("checkbox", { name: "Usar este valor en adelante" }).check();
    await dialogo.getByRole("button", { name: "Confirmar aporte" }).click();
    await expect(page.getByText(`Aporte a ${meta}`)).toHaveCount(0);
    await expect(registro(page, meta)).toContainText("$300.000");

    const db = await clienteUsuario();
    const regla = await db.from("reglas_aporte").select("valor").eq("id", reglaId).single();
    expect(regla.data?.valor).toBe(300_000);
    await esperarSaldo(page, bolsa, "$200.000");
  });

  test("omitir un pendiente no mueve dinero", async ({ page }) => {
    const bolsa = `Origen ${marca()}`;
    const meta = `Casa ${marca()}`;
    await metaConPendiente(meta, await bolsaDePrueba(bolsa, 500_000));
    await iniciarSesion(page, "/ahorros");
    await accionPendiente(page, meta, "Omitir esta vez");
    const dialogo = page.getByRole("alertdialog", { name: /Omitir el aporte del/ });
    await expect(dialogo).toContainText("La fecha final no cambia");
    await dialogo.getByRole("button", { name: "Omitir esta vez" }).click();
    await expect(page.getByText(`Aporte a ${meta}`)).toHaveCount(0);
    await esperarSaldo(page, bolsa, "$500.000");
  });
});
