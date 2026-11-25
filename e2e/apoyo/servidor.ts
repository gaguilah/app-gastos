import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { AddressInfo } from "node:net";

const tipos: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

/**
 * Sirve el build (dist/) en un puerto propio para probar la actualización de la PWA sin tocar
 * el servidor de las demás pruebas. `publicar()` simula una versión nueva: cambia un byte de sw.js.
 */
export async function servirBuild() {
  let version = 0;
  const servidor: Server = createServer(async (pedido, respuesta) => {
    const ruta = normalize(new URL(pedido.url ?? "/", "http://x").pathname).replace(/^\/+/, "");
    let archivo = join("dist", ruta);
    let cuerpo: Buffer;
    try {
      cuerpo = await readFile(archivo);
    } catch {
      archivo = join("dist", "index.html"); // SPA
      cuerpo = await readFile(archivo);
    }
    if (ruta === "sw.js") cuerpo = Buffer.concat([cuerpo, Buffer.from(`\n// ${version}`)]);
    respuesta.writeHead(200, {
      "Content-Type": tipos[extname(archivo)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    respuesta.end(cuerpo);
  });
  await new Promise<void>((listo) => servidor.listen(0, "localhost", listo));
  return {
    url: `http://localhost:${(servidor.address() as AddressInfo).port}`,
    publicar: () => version++,
    cerrar: () => new Promise((listo) => servidor.close(listo)),
  };
}
