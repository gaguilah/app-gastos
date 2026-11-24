import { expect, test } from "@playwright/test";
import { enlaceDelCorreo } from "./apoyo/correo";

// Usuarios de supabase/seed.sql (solo existen en Supabase local).
const USUARIO = "usuario-a@prueba.local";
const CONTRASENA = "prueba-local-123";

test("inicia sesión y vuelve a la ruta pedida", async ({ page }) => {
  await page.goto("/bolsas");
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fbolsas$/);
  await page.getByLabel("Correo").fill(USUARIO);
  await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL("/bolsas");
  await expect(page.getByRole("heading", { level: 1, name: "Bolsas" })).toBeVisible();

  // Con sesión, el login lleva a Inicio.
  await page.goto("/login");
  await expect(page).toHaveURL("/");
});

test("con la contraseña mal muestra el error y marca los campos", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(USUARIO);
  await page.getByLabel("Contraseña", { exact: true }).fill("no-es-esta");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("alert")).toContainText("El correo o la contraseña no coinciden.");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page).toHaveURL("/login");
});

test("recuperar con un correo que no existe responde lo mismo", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible();
  await page.getByLabel("Correo").fill("no-existe@prueba.local");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si el correo está registrado");
});

test("recupera la contraseña con el enlace del correo", async ({ page }, info) => {
  // Un usuario por tamaño: las corridas en paralelo no se pisan el enlace.
  const correo = `recuperar-${info.project.name}@prueba.local`;
  const nueva = `nueva-${Date.now()}`;
  const desde = new Date(Date.now() - 1000);

  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si el correo está registrado");

  await page.goto(await enlaceDelCorreo(correo, desde));
  await expect(page).toHaveURL(/\/nueva-contrasena/);
  await page.getByLabel("Contraseña nueva").fill(nueva);
  await page.getByLabel("Confirma la contraseña").fill(nueva);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();

  // Entra con la contraseña nueva en una sesión limpia.
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(nueva);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL("/");
});

test("sin enlace válido, /nueva-contrasena dice que venció y ofrece pedir otro", async ({
  page,
}) => {
  await page.goto("/nueva-contrasena");
  await expect(page.getByRole("alert")).toContainText("El enlace venció o ya se usó.");
  await page.getByRole("link", { name: "Pedir otro enlace" }).click();
  await expect(page).toHaveURL("/recuperar");
});
