import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { CONTRASENA, USUARIO } from "./sesion";

// Mismos valores públicos de Supabase local que usa playwright.config.ts.
const URL = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const CLAVE =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

/**
 * Las pruebas corren en paralelo contra el mismo usuario: cada nombre lleva una marca al azar,
 * distinta entre corridas para que los nombres de una no parezcan duplicados de los de otra.
 */
export const marca = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

/** Prepara datos como el usuario de prueba (con RLS, igual que la app). */
export async function clienteUsuario() {
  const cliente = createClient(URL, CLAVE, { auth: { persistSession: false } });
  const { error } = await cliente.auth.signInWithPassword({ email: USUARIO, password: CONTRASENA });
  if (error) throw error;
  return cliente;
}

/** Crea un lugar con un gasto, para probar que eliminar en uso archiva. */
export async function lugarConGasto(nombre: string) {
  const db = await clienteUsuario();
  const lugar = await db.rpc("crear_lugar", { p_nombre: nombre });
  if (lugar.error) throw lugar.error;
  const categoria = await db.from("categorias").select("id").eq("nombre", "Alimentación").single();
  const bolsa = await db.from("bolsas").select("id").eq("nombre", "Efectivo").single();
  const gasto = await db.from("gastos").insert({
    titulo: `Compra en ${nombre}`,
    fecha: "2026-11-03",
    valor: 1000,
    categoria_id: categoria.data!.id,
    bolsa_id: bolsa.data!.id,
    lugar_id: lugar.data[0].id,
  });
  if (gasto.error) throw gasto.error;
}

/** Elige una acción del menú ⋮ de un registro: menú flotante u hoja inferior según el tamaño. */
export async function elegirAccion(page: Page, registro: string, accion: string | RegExp) {
  await page.getByRole("button", { name: `Acciones de «${registro}»` }).click();
  const opcion = page
    .getByRole("menuitem", { name: accion })
    .or(page.getByRole("dialog", { name: registro }).getByRole("button", { name: accion }));
  await expect(opcion).toBeVisible();
  return opcion;
}
