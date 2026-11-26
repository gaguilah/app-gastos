import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Listas } from "./Listas";

const tablas: Record<string, unknown[]> = {
  formas_pago: [
    { id: "f1", nombre: "Débito", clase: "medio" },
    { id: "f2", nombre: "Bre-B", clase: "canal" },
  ],
  uso_formas_pago: [{ id: "f1", usos: 22, ultimo: "2026-11-25" }],
  lugares: [
    { id: "l1", nombre: "D1 Chapinero", usos: 0 },
    { id: "l2", nombre: "D1 Chapinero Alto" },
    { id: "l3", nombre: "Terpel Av. 68" },
  ],
  uso_lugares: [
    { id: "l1", usos: 12, ultimo: "2026-11-24" },
    { id: "l2", usos: 1, ultimo: "2026-11-03" },
  ],
  personas: [
    { id: "p1", nombre: "Camila R.", tipo: "persona" },
    { id: "p2", nombre: "Bancolombia", tipo: "banco" },
  ],
  uso_personas: [],
};

const rpc = vi.fn();
const update = vi.fn();
const insert = vi.fn();

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  // select().eq().neq() o select() a secas: la cadena también es una promesa.
  const consulta = (filas: unknown[]) => {
    const cadena = Object.assign(ok(filas), { eq: () => cadena, neq: () => cadena });
    return cadena;
  };
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => ({
      select: () => consulta(tablas[tabla] ?? []),
      update: (datos: unknown) => ({
        eq: (_: string, id: string) => (
          update(tabla, datos, id),
          update.mock.results.at(-1)?.value ?? ok(null)
        ),
      }),
      insert: (datos: unknown) => {
        insert(tabla, datos);
        return { select: () => ({ single: () => ok({ id: "nueva" }) }) };
      },
    })),
    rpc: rpc.mockImplementation((nombre: string) =>
      ok(
        nombre === "posibles_duplicados"
          ? [{ a_id: "l1", a_nombre: "D1 Chapinero", b_id: "l2", b_nombre: "D1 Chapinero Alto" }]
          : null,
      ),
    ),
  });
}

function abrir(ruta = "/listas") {
  const router = createMemoryRouter([{ path: "/listas", Component: Listas }], {
    initialEntries: [ruta],
  });
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const abrirMenu = (nombre: string) =>
  fireEvent.pointerDown(screen.getByRole("button", { name: `Acciones de «${nombre}»` }), {
    button: 0,
    ctrlKey: false,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T15:00:00Z") });
  falsoSupabase();
});
afterEach(() => vi.useRealTimers());

describe("Listas", () => {
  it("formas de pago: conteos por pestaña, canal distinguido y sin bolsas", async () => {
    abrir();
    const fila = (await screen.findByText("Débito")).closest("tr")!;
    expect(within(fila).getByText("22")).toBeInTheDocument();
    expect(within(fila).getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("Bre-B (canal)")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Formas de pago · 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Lugares · 3" })).toBeInTheDocument();
    expect(screen.getByText(/se manejan en Bolsas/)).toBeInTheDocument();
  });

  it("en el móvil, tarjetas con «12 gastos · último: Ayer»", async () => {
    ponerMovil(true);
    abrir("/listas?lista=lugares");
    expect(await screen.findByText("12 gastos · último: Ayer")).toBeInTheDocument();
    expect(screen.getByText("1 gasto · último: 3 nov")).toBeInTheDocument();
    expect(screen.getByText("Sin uso")).toBeInTheDocument();
  });

  it("posible duplicado: Revisar abre unir y «No son el mismo» guarda el par", async () => {
    abrir("/listas?lista=lugares");
    expect(
      await screen.findByText(/«D1 Chapinero» y «D1 Chapinero Alto» tienen nombres parecidos/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    const dialogo = await screen.findByRole("alertdialog", {
      name: "Unir «D1 Chapinero Alto» con…",
    });
    expect(within(dialogo).getByRole("radio", { name: "D1 Chapinero" })).toBeChecked();
    expect(dialogo).toHaveTextContent("quedará en «D1 Chapinero». Esto no se puede deshacer.");
    fireEvent.click(within(dialogo).getByRole("button", { name: "No son el mismo" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("marcar_distintos", {
        p_entidad: "lugar",
        p_a: "l2",
        p_b: "l1",
      }),
    );
  });

  it("unir desde el menú mueve todo al elegido", async () => {
    abrir("/listas?lista=lugares");
    await screen.findByText("Terpel Av. 68");
    abrirMenu("D1 Chapinero Alto");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Unir con…" }));
    const dialogo = await screen.findByRole("alertdialog");
    const unir = within(dialogo).getByRole("button", { name: "Unir" });
    expect(unir).toBeDisabled();
    fireEvent.click(within(dialogo).getByRole("radio", { name: "D1 Chapinero" }));
    fireEvent.click(unir);
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("unir_lugares", { p_origen: "l2", p_destino: "l1" }),
    );
  });

  it("agregar un lugar que ya existe no crea otro y ofrece usar el existente", async () => {
    rpc.mockImplementation((nombre: string) =>
      Promise.resolve({
        data: nombre === "crear_lugar" ? [{ id: "l3", estado: "existente" }] : [],
        error: null,
      }),
    );
    abrir("/listas?lista=lugares");
    await screen.findByText("Terpel Av. 68");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Agregar a la lista" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "terpel av 68" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar" }));
    expect(
      await within(dialogo).findByText(/«Terpel Av. 68» ya está en la lista/),
    ).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("crear_lugar", { p_nombre: "terpel av 68" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Usar el existente" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("una persona con número de tarjeta se rechaza con el mensaje de tarjetas", async () => {
    rpc.mockImplementation((nombre: string) =>
      Promise.resolve(
        nombre === "crear_persona"
          ? {
              data: null,
              error: {
                code: "23514",
                message:
                  'new row for relation "personas" violates check constraint "personas_nombre_check"',
              },
            }
          : { data: [], error: null },
      ),
    );
    abrir("/listas?lista=personas");
    await screen.findByText("Camila R.");
    expect(screen.getByText("Banco")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("radio", { name: "Persona" })).toBeChecked();
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "Visa 4111 1111 1111 1111" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar" }));
    expect(await within(dialogo).findByText(/No guardamos números de tarjeta/)).toBeInTheDocument();
  });

  it("renombrar a un nombre que ya existe ofrece unirlos", async () => {
    update.mockReturnValue(
      Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } }),
    );
    abrir("/listas?lista=lugares");
    await screen.findByText("Terpel Av. 68");
    abrirMenu("D1 Chapinero Alto");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Renombrar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Renombrar «D1 Chapinero Alto»" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "d1 chapinero" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(await within(dialogo).findByText(/Ya hay uno con ese nombre/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Unir con el existente" }));
    const unir = await screen.findByRole("alertdialog", { name: "Unir «D1 Chapinero Alto» con…" });
    expect(within(unir).getByRole("radio", { name: "D1 Chapinero" })).toBeChecked();
  });

  it("eliminar en uso avisa que se archivó y explica qué se conserva", async () => {
    rpc.mockImplementation((nombre: string) =>
      Promise.resolve({ data: nombre === "eliminar_forma_pago" ? "archivado" : [], error: null }),
    );
    abrir();
    await screen.findByText("Débito");
    abrirMenu("Débito");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialogo = await screen.findByRole("alertdialog", { name: "¿Eliminar «Débito»?" });
    expect(dialogo).toHaveTextContent(/lo conserva en el historial/);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("eliminar_forma_pago", { p_id: "f1" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("una lista vacía muestra qué hacer", async () => {
    tablas.personas = [];
    abrir("/listas?lista=personas");
    expect(await screen.findByText("Esta lista está vacía")).toBeInTheDocument();
  });
});
