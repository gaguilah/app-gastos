import { expect } from "@playwright/test";

// Buzón de prueba de Supabase local (Mailpit). Nunca hay correos reales.
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type Mensaje = { ID: string; Created: string };

/** Espera el correo más reciente para `para` enviado después de `desde` y devuelve su primer enlace. */
export async function enlaceDelCorreo(para: string, desde: Date): Promise<string> {
  let enlace = "";
  await expect
    .poll(
      async () => {
        const busqueda = await fetch(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}&limit=5`,
        );
        const { messages } = (await busqueda.json()) as { messages: Mensaje[] };
        const nuevo = messages.find((m) => new Date(m.Created) >= desde);
        if (!nuevo) return "";
        const mensaje = (await (await fetch(`${MAILPIT}/api/v1/message/${nuevo.ID}`)).json()) as {
          HTML: string;
        };
        enlace = /href="([^"]+)"/.exec(mensaje.HTML)?.[1]?.replaceAll("&amp;", "&") ?? "";
        return enlace;
      },
      { timeout: 15_000 },
    )
    .not.toBe("");
  return enlace;
}
