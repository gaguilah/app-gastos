import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

test("cerrar sesión pide confirmación y después Atrás no muestra pantallas protegidas", async ({
  page,
}) => {
  await iniciarSesion(page);
  await page.goto("/ajustes");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const confirmar = page.getByRole("alertdialog", { name: "¿Cerrar sesión?" });
  await confirmar.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL("/login");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("el idioma cambia sin recargar y se conserva al volver a abrir la app", async ({ page }) => {
  await iniciarSesion(page, "/ajustes");
  await page.getByRole("button", { name: /Idioma/ }).click();
  const dialogo = page.getByRole("dialog", { name: "Idioma" });
  await dialogo.getByText("English").click();
  await dialogo.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Language.*English/ })).toBeVisible();
});
