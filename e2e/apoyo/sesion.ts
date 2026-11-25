import { expect, type Page } from "@playwright/test";

// Usuario de supabase/seed.sql (solo existe en Supabase local).
export const USUARIO = "usuario-a@prueba.local";
export const CONTRASENA = "prueba-local-123";

export async function iniciarSesion(page: Page, ruta = "/") {
  await page.goto(ruta);
  // Por atributos y no por texto: sirve en los dos idiomas.
  await page.locator("input[autocomplete=email]").fill(USUARIO);
  await page.locator("input[autocomplete=current-password]").fill(CONTRASENA);
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(ruta);
}
