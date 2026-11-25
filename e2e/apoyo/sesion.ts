import { expect, type Page } from "@playwright/test";

// Usuario de supabase/seed.sql (solo existe en Supabase local).
export const USUARIO = "usuario-a@prueba.local";
export const CONTRASENA = "prueba-local-123";

export async function iniciarSesion(page: Page, ruta = "/") {
  await page.goto(ruta);
  await page.getByLabel("Correo").fill(USUARIO);
  await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(ruta);
}
