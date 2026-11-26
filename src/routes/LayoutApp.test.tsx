import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { SesionContext } from "@/features/auth/contexto";
import { ponerMovil } from "@/test/setup";
import { crearRutas } from "./router";

function abrir(ruta: string) {
  const router = createMemoryRouter(crearRutas(), { initialEntries: [ruta] });
  render(
    <SesionContext value={{ cargando: false, sesion: { user: {} } as Session, recuperando: false }}>
      <RouterProvider router={router} />
    </SesionContext>,
  );
  return router;
}

// Los dos menús están en el DOM; el CSS muestra uno u otro según el tamaño (lo prueba la E2E).
const menus = () => screen.getAllByRole("navigation", { name: "Principal" });

describe("layout común", () => {
  it("el menú lateral tiene los 13 destinos del lienzo y marca el activo", async () => {
    abrir("/periodicos");
    await screen.findByRole("heading", { level: 1, name: "Gastos periódicos" });
    const lateral = within(menus()[0]!);
    expect(lateral.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Inicio",
      "Gastos",
      "Ingresos",
      "Bolsas",
      "Ahorros",
      "Categorías",
      "Reportes",
      "Presupuesto",
      "Periódicos",
      "Préstamos",
      "Deudas",
      "Listas",
      "Ajustes",
    ]);
    expect(lateral.getByRole("link", { name: "Periódicos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Registrar gasto" })).toHaveAttribute(
      "href",
      "/gastos/nuevo",
    );
  });

  it("la barra inferior tiene Inicio, Gastos, Registrar, Reportes y Más", async () => {
    abrir("/");
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    const inferior = within(menus()[1]!);
    expect(inferior.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Inicio",
      "Gastos",
      "Registrar",
      "Reportes",
      "Más",
    ]);
    expect(inferior.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });

  it("en la barra inferior, «Más» queda activo en los destinos de su lista", async () => {
    abrir("/periodicos");
    await screen.findByRole("heading", { level: 1, name: "Gastos periódicos" });
    expect(within(menus()[1]!).getByRole("link", { name: "Más" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("Más", () => {
  it("en móvil lista los 10 destinos de DESIGN.md §3", async () => {
    ponerMovil(true);
    abrir("/mas");
    const lista = within(await screen.findByRole("navigation", { name: "Más" }));
    expect(lista.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Ingresos",
      "Bolsas",
      "Ahorros",
      "Categorías",
      "Presupuesto y período",
      "Gastos periódicos",
      "Préstamos que hago",
      "Deudas",
      "Formas de pago, lugares y personas",
      "Ajustes",
    ]);
  });

  it("en tablet y computador lleva a Inicio", async () => {
    const router = abrir("/mas");
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(router.state.location.pathname).toBe("/");
  });
});
