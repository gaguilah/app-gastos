import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Bolsas } from "./Bolsas";

let tablas: Record<string, unknown[]>;
const rpc = vi.fn();

function datos() {
  tablas = {
    bolsas: [
      { id: "efe", nombre: "Efectivo" },
      { id: "neq", nombre: "Nequi" },
      { id: "dav", nombre: "Daviplata" },
    ],
    saldos_bolsa: [
      { bolsa_id: "efe", saldo: 35_000 },
      { bolsa_id: "neq", saldo: 412_300 },
      { bolsa_id: "dav", saldo: -14_000 },
    ],
    uso_bolsas: [
      {
        bolsa_id: "efe",
        usos: 6,
        ultimo: "2026-11-25",
        ultimo_titulo: "Taxi al centro",
        ultimo_tipo: "gasto",
        en_uso_por_reglas: true,
      },
      {
        bolsa_id: "neq",
        usos: 14,
        ultimo: "2026-11-03",
        ultimo_titulo: null,
        ultimo_tipo: "recarga",
        en_uso_por_reglas: false,
      },
      {
        bolsa_id: "dav",
        usos: 0,
        ultimo: null,
        ultimo_titulo: null,
        ultimo_tipo: null,
        en_uso_por_reglas: false,
      },
    ],
    movimientos_de_bolsa: [
      {
        id: "g1",
        tipo: "gasto",
        fecha: "2026-11-25",
        titulo: "Almuerzo",
        valor: -28_000,
        contraparte: "La Puerta Falsa",
      },
      {
        id: "t1",
        tipo: "traslado",
        fecha: "2026-11-10",
        titulo: null,
        valor: 50_000,
        contraparte: "Efectivo",
      },
      {
        id: "i1",
        tipo: "ingreso",
        fecha: "2026-11-09",
        titulo: "Freelance: logo",
        valor: 350_000,
        contraparte: "Trabajo independiente",
      },
    ],
  };
}

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  // select().eq().order()… o select() a secas: la cadena también es una promesa.
  const consulta = (filas: unknown[]) => {
    const cadena = Object.assign(ok(filas), {
      eq: () => cadena,
      not: () => cadena,
      order: () => cadena,
      single: () => ok(filas[0]),
    });
    return cadena;
  };
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => ({ select: () => consulta(tablas[tabla] ?? []) })),
    rpc: rpc.mockImplementation((nombre: string) =>
      ok(nombre === "eliminar_bolsa" ? "archivado" : "nuevo-id"),
    ),
  });
}

function abrir() {
  const router = createMemoryRouter(
    [
      { path: "/bolsas", Component: Bolsas },
      { path: "/ingresos", Component: () => <p>Pantalla de ingresos</p> },
    ],
    { initialEntries: ["/bolsas"] },
  );
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const abrirMenu = async (nombre: string) =>
  fireEvent.pointerDown(await screen.findByRole("button", { name: `Acciones de «${nombre}»` }), {
    button: 0,
    ctrlKey: false,
  });
const elegir = async (accion: string) =>
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${accion}`) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T15:00:00Z") });
  datos();
  falsoSupabase();
});
afterEach(() => vi.useRealTimers());

describe("Bolsas", () => {
  it("saldo total, último movimiento y saldo negativo con aviso", async () => {
    abrir();
    const efectivo = (await screen.findByText("Efectivo")).closest("tr")!;
    expect(within(efectivo).getByText("Taxi al centro · Hoy")).toBeInTheDocument();
    expect(within(efectivo).getByText("$35.000")).toBeInTheDocument();
    expect(screen.getByText("Recarga · 3 nov")).toBeInTheDocument();
    expect(screen.getByText("$433.300")).toBeInTheDocument();
    const daviplata = screen.getByText("Daviplata").closest("tr")!;
    expect(within(daviplata).getByText("−$14.000")).toBeInTheDocument();
    expect(within(daviplata).getByText("Saldo negativo")).toBeInTheDocument();
    expect(within(daviplata).getByText("Sin movimientos")).toBeInTheDocument();
  });

  it("en el móvil, tarjetas con el conteo de movimientos", async () => {
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("14 movimientos")).toBeInTheDocument();
    expect(screen.getByText("6 movimientos")).toBeInTheDocument();
  });

  it("sin bolsas, invita a crear la primera", async () => {
    tablas.bolsas = [];
    abrir();
    expect(await screen.findByText("Aún no tienes bolsas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear bolsa" })).toBeInTheDocument();
  });

  it("nueva bolsa con saldo inicial; un nombre repetido se marca en el campo", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "bolsa.nombre_repetido" },
    });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Nueva bolsa" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nueva bolsa" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), {
      target: { value: "efectivo VIAJE" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Saldo inicial"), {
      target: { value: "200000" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear bolsa" }));
    expect(
      await within(dialogo).findByText("Ya tienes una bolsa con ese nombre."),
    ).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("crear_bolsa", {
      p_nombre: "efectivo VIAJE",
      p_saldo_inicial: 200_000,
    });
  });

  it("movimientos con signo, detalle y fecha", async () => {
    abrir();
    await abrirMenu("Nequi");
    await elegir("Ver movimientos");
    const dialogo = await screen.findByRole("dialog", { name: "Movimientos de Nequi" });
    expect(await within(dialogo).findByText("Almuerzo")).toBeInTheDocument();
    expect(within(dialogo).getByText("Hoy · La Puerta Falsa")).toBeInTheDocument();
    expect(within(dialogo).getByText("−$28.000")).toBeInTheDocument();
    expect(within(dialogo).getByText("Traslado")).toBeInTheDocument();
    expect(within(dialogo).getByText("10 nov · desde Efectivo")).toBeInTheDocument();
    expect(within(dialogo).getByText("+$350.000")).toBeInTheDocument();
  });

  it("en el período nuevo, «Viene del período anterior» con el saldo al cierre (S6)", async () => {
    tablas.perfiles = [
      {
        id: "yo",
        dia_inicio: 1,
        salario_base: 0,
        presupuesto_salario_base: 0,
        categoria_salario_id: null,
      },
    ];
    tablas.disponible_periodo = [
      { periodo_id: "oct", fecha_inicio: "2026-10-01", fecha_fin: "2026-10-31" },
      { periodo_id: "nov", fecha_inicio: "2026-11-01", fecha_fin: "2026-11-30" },
    ];
    tablas.periodos = [
      { id: "oct", cerrado_at: "2026-11-01T05:00:00Z", recerrado_at: null },
      { id: "nov", cerrado_at: null, recerrado_at: null },
    ];
    tablas.movimientos_de_bolsa.push({
      id: "s1",
      tipo: "sobrante",
      fecha: "2026-10-30",
      titulo: null,
      valor: 100_000,
      contraparte: null,
    });
    rpc.mockImplementation((nombre: string) =>
      Promise.resolve({
        data: nombre === "saldos_bolsa_al" ? [{ bolsa_id: "neq", saldo: 40_300 }] : null,
        error: null,
      }),
    );
    abrir();
    await abrirMenu("Nequi");
    await elegir("Ver movimientos");
    const dialogo = await screen.findByRole("dialog", { name: "Movimientos de Nequi" });
    const viene = await within(dialogo).findByText("Viene del período anterior");
    expect(viene.nextSibling).toHaveTextContent("$40.300");
    expect(rpc).toHaveBeenCalledWith("saldos_bolsa_al", { p_fecha: "2026-10-31" });
    // Primero lo del período en curso, luego la línea y después lo anterior.
    const textos = within(dialogo)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(textos.findIndex((x) => x?.startsWith("Freelance"))).toBeLessThan(
      textos.findIndex((x) => x?.startsWith("Viene")),
    );
    expect(textos.at(-1)).toMatch(/^Sobrante del período.*\+\$100\.000$/);
  });

  it("recargar de mi cuenta no toca el presupuesto", async () => {
    abrir();
    await abrirMenu("Efectivo");
    await elegir("Recargar");
    const dialogo = await screen.findByRole("dialog", { name: "Recargar Efectivo" });
    expect(within(dialogo).getByRole("radio", { name: /De mi cuenta/ })).toBeChecked();
    expect(within(dialogo).queryByText(/Del presupuesto/)).not.toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Valor"), { target: { value: "100000" } });
    expect(
      within(dialogo).getByText(
        "Efectivo queda en $135.000. El disponible del presupuesto no cambia.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recargar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("recargar_bolsa", { p_bolsa_id: "efe", p_valor: 100_000 }),
    );
  });

  it("recargar de otra bolsa es un traslado; ingreso nuevo lleva a Ingresos", async () => {
    const router = abrir();
    await abrirMenu("Efectivo");
    await elegir("Recargar");
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "De otra bolsa" }));
    fireEvent.change(within(dialogo).getByLabelText("Valor"), { target: { value: "50000" } });
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Nequi/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recargar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("trasladar", {
        p_origen: "neq",
        p_destino: "efe",
        p_valor: 50_000,
      }),
    );

    await abrirMenu("Efectivo");
    await elegir("Recargar");
    const otro = await screen.findByRole("dialog");
    fireEvent.click(within(otro).getByRole("radio", { name: /Ingreso nuevo/ }));
    fireEvent.click(within(otro).getByRole("button", { name: "Ir a registrar ingreso" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/ingresos"));
    expect(router.state.location.search).toBe("?nuevo=1&destino=efe");
  });

  it("ajustar hacia abajo explica el gasto desconocido", async () => {
    abrir();
    await abrirMenu("Nequi");
    await elegir("Ajustar saldo");
    const dialogo = await screen.findByRole("dialog", { name: "Ajustar saldo de Nequi" });
    fireEvent.change(within(dialogo).getByLabelText("Saldo real"), {
      target: { value: "405000" },
    });
    expect(within(dialogo).getByText(/Diferencia de −\$7.300/)).toHaveTextContent(
      "el disponible baja $7.300",
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Ajustar saldo" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("ajustar_saldo", {
        p_bolsa_id: "neq",
        p_saldo_real: 405_000,
      }),
    );
  });

  it("eliminar con saldo lo pasa a otra bolsa y conserva el historial", async () => {
    abrir();
    await abrirMenu("Nequi");
    await elegir("Eliminar");
    const dialogo = await screen.findByRole("alertdialog", {
      name: "¿Eliminar la bolsa «Nequi»?",
    });
    expect(dialogo).toHaveTextContent("Sus 14 movimientos se conservan en el historial");
    expect(within(dialogo).getByText("Qué hacer con el saldo de $412.300")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Pasar a Efectivo" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar bolsa" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("eliminar_bolsa", { p_bolsa_id: "neq", p_destino: "efe" }),
    );
  });

  it("una bolsa origen de una regla activa no se puede eliminar y dice por qué", async () => {
    abrir();
    await abrirMenu("Efectivo");
    const eliminar = await screen.findByRole("menuitem", { name: /^Eliminar/ });
    expect(eliminar).toHaveAttribute("aria-disabled", "true");
    expect(eliminar).toHaveTextContent("Es origen de un gasto periódico");
  });
});
