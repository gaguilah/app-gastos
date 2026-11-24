import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { SesionContext, type EstadoSesion } from "@/features/auth/contexto";
import { crearRutas } from "./router";
import { rutasProtegidas } from "./rutas";

const sesionFalsa = { user: { id: "u1", email: "usuario-a@prueba.local" } } as Session;

function abrir(ruta: string, estado: Partial<EstadoSesion> = {}) {
  const router = createMemoryRouter(crearRutas(), { initialEntries: [ruta] });
  render(
    <SesionContext value={{ cargando: false, sesion: null, recuperando: false, ...estado }}>
      <RouterProvider router={router} />
    </SesionContext>,
  );
  return router;
}

describe("rutas protegidas", () => {
  it.each([...rutasProtegidas, "/no-existe"])("sin sesión, %s lleva a /login", async (ruta) => {
    const router = abrir(ruta);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe(`?siguiente=${encodeURIComponent(ruta)}`);
  });

  it("recuerda también la búsqueda de la ruta pedida", async () => {
    const router = abrir("/bolsas?x=1");
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(new URLSearchParams(router.state.location.search).get("siguiente")).toBe("/bolsas?x=1");
  });

  it("mientras se verifica la sesión muestra la carga, no el login", () => {
    abrir("/gastos", { cargando: true });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Iniciar sesión" })).not.toBeInTheDocument();
  });

  it("con sesión, cada módulo muestra su pantalla", async () => {
    abrir("/bolsas", { sesion: sesionFalsa });
    expect(await screen.findByRole("heading", { level: 1, name: "Bolsas" })).toBeInTheDocument();
    expect(screen.getByText("En construcción")).toBeInTheDocument();
  });

  it("con sesión, una ruta desconocida muestra No encontrada", async () => {
    abrir("/no-existe", { sesion: sesionFalsa });
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Inicio" })).toHaveAttribute("href", "/");
  });
});

describe("login con sesión abierta", () => {
  it("lleva a Inicio", async () => {
    const router = abrir("/login", { sesion: sesionFalsa });
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(router.state.location.pathname).toBe("/");
  });

  it("lleva a la ruta pedida", async () => {
    const router = abrir("/login?siguiente=%2Fgastos", { sesion: sesionFalsa });
    await screen.findByRole("heading", { level: 1, name: "Gastos" });
    expect(router.state.location.pathname).toBe("/gastos");
  });

  it("ignora un destino externo", async () => {
    const router = abrir("/login?siguiente=%2F%2Fotro.sitio", { sesion: sesionFalsa });
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("sin registro", () => {
  it("no existe /registro: sin sesión pide login y con sesión no se encuentra", async () => {
    abrir("/registro", { sesion: sesionFalsa });
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
  });

  it("el código no llama a signUp ni tiene rutas de registro", () => {
    const codigo = Object.entries(
      import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}"], {
        query: "?raw",
        import: "default",
        eager: true,
      }),
    );
    const conRegistro = codigo
      .filter(([, texto]) => /signUp|\/registro|\/signup/i.test(texto))
      .map(([ruta]) => ruta);
    expect(conRegistro).toEqual([]);
  });
});
