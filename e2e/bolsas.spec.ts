import { expect, test } from "@playwright/test";
import { bolsaDePrueba, elegirAccion, esperarSaldo, marca, registro } from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

test.describe("Bolsas", () => {
  test("crear con saldo inicial; un nombre repetido se rechaza", async ({ page }) => {
    const nombre = `Viaje ${marca()}`;
    await iniciarSesion(page, "/bolsas");
    for (const escrito of [nombre, `  ${nombre.toUpperCase()} `]) {
      await page.getByRole("button", { name: "Nueva bolsa" }).click();
      const dialogo = page.getByRole("dialog", { name: "Nueva bolsa" });
      await dialogo.getByLabel("Nombre").fill(escrito);
      await dialogo.getByLabel("Saldo inicial").fill("200000");
      await dialogo.getByRole("button", { name: "Crear bolsa" }).click();
      if (escrito === nombre) await expect(dialogo).toBeHidden();
      else await expect(dialogo).toContainText("Ya tienes una bolsa con ese nombre.");
    }
    await page.keyboard.press("Escape");
    await expect(registro(page, nombre)).toContainText("$200.000");
  });

  test("recargar de mi cuenta, trasladar y ver los movimientos con signo", async ({ page }) => {
    const origen = `Origen ${marca()}`;
    const destino = `Destino ${marca()}`;
    await bolsaDePrueba(origen, 100_000);
    await bolsaDePrueba(destino);
    await iniciarSesion(page, "/bolsas");

    await (await elegirAccion(page, origen, "Recargar")).click();
    const recargar = page.getByRole("dialog", { name: `Recargar ${origen}` });
    await recargar.getByLabel("Valor").fill("100000");
    await expect(recargar).toContainText(`${origen} queda en $200.000.`);
    await recargar.getByRole("button", { name: "Recargar" }).click();
    await expect(registro(page, origen)).toContainText("$200.000");

    await (await elegirAccion(page, origen, "Trasladar a otra bolsa")).click();
    const trasladar = page.getByRole("dialog", { name: `Trasladar desde ${origen}` });
    await trasladar.getByLabel("Valor").fill("50000");
    await trasladar.getByRole("radio", { name: new RegExp(destino) }).click();
    await trasladar.getByRole("button", { name: "Trasladar" }).click();
    await expect(registro(page, origen)).toContainText("$150.000");
    await expect(registro(page, destino)).toContainText("$50.000");

    await (await elegirAccion(page, origen, "Ver movimientos")).click();
    const movimientos = page.getByRole("dialog", { name: `Movimientos de ${origen}` });
    await expect(movimientos).toContainText("−$50.000");
    await expect(movimientos).toContainText("+$100.000");
    await expect(movimientos).toContainText(`a ${destino}`);
  });

  test("eliminar con saldo lo pasa a otra bolsa", async ({ page }) => {
    const queda = `Queda ${marca()}`;
    const sale = `Sale ${marca()}`;
    await bolsaDePrueba(queda, 10_000);
    await bolsaDePrueba(sale, 412_300);
    await iniciarSesion(page, "/bolsas");
    await (await elegirAccion(page, sale, /^Eliminar/)).click();
    const dialogo = page.getByRole("alertdialog", { name: `¿Eliminar la bolsa «${sale}»?` });
    await expect(dialogo).toContainText("Qué hacer con el saldo de $412.300");
    await dialogo.getByRole("radio", { name: `Pasar a ${queda}` }).click();
    await dialogo.getByRole("button", { name: "Eliminar bolsa" }).click();
    await expect(registro(page, sale)).toHaveCount(0);
    await esperarSaldo(page, queda, "$422.300");
  });
});
