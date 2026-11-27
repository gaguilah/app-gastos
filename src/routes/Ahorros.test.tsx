import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Ahorros } from "./Ahorros";

let tablas: Record<string, unknown>;
let estados: unknown[];
const rpc = vi.fn();

const estado = (
  meta_id: string,
  nombre: string,
  saldo: number,
  monto_meta: number,
  estado: string,
  fecha_final: string,
) => ({
  meta_id,
  user_id: "yo",
  nombre,
  monto_meta,
  fecha_final,
  saldo,
  ritmo_ideal: saldo,
  aportes_restantes: 7,
  aporte_sugerido: 300_000,
  fecha_proyectada: null,
  estado,
});

function datos() {
  estados = [
    estado("viaje", "Viaje a Cartagena", 1_200_000, 3_000_000, "atrasada", "2027-06-30"),
    estado("fondo", "Fondo de emergencia", 5_000_000, 5_000_000, "cumplida", "2026-12-31"),
  ];
  tablas = {
    metas_ahorro: [
      { id: "viaje", icono: "plane", bolsa_id: "b-viaje", pausada: false },
      { id: "fondo", icono: "shield", bolsa_id: "b-fondo", pausada: false },
    ],
    reglas_aporte: [
      {
        id: "r1",
        meta_id: "viaje",
        valor: 250_000,
        frecuencia: "mensual",
        dia: 5,
        bolsa_id: "neq",
        medio_id: null,
        afecta_presupuesto: false,
        proxima_fecha: "2026-12-05",
        pausada: false,
        created_at: "2026-06-01T00:00:00Z",
        bolsa: { nombre: "Nequi" },
        medio: null,
      },
    ],
    pendientes: [
      {
        id: "p1",
        fecha: "2026-11-05",
        valor: 250_000,
        meta_id: "viaje",
        meta: { nombre: "Viaje a Cartagena" },
        regla: { valor: 250_000, frecuencia: "mensual", bolsa: { nombre: "Nequi" }, medio: null },
      },
    ],
    aportes: [{ valor: 250_000 }, { valor: 100_000 }],
    perfiles: { id: "yo", dia_inicio: 1, salario_base: 0, presupuesto_salario_base: 0 },
    disponible_periodo: [
      {
        periodo_id: "nov",
        fecha_inicio: "2026-11-01",
        fecha_fin: "2026-11-30",
        presupuesto: 3_200_000,
        ingresos_presupuesto: 0,
        disponible: 3_000_000,
      },
    ],
    periodos: [{ id: "nov", cerrado_at: null, recerrado_at: null }],
    bolsas: [
      { id: "efe", nombre: "Efectivo" },
      { id: "neq", nombre: "Nequi" },
    ],
    saldos_bolsa: [
      { bolsa_id: "efe", saldo: 35_000 },
      { bolsa_id: "neq", saldo: 412_300 },
    ],
    uso_bolsas: [],
    formas_pago: [{ id: "deb", nombre: "Débito" }],
    movimientos_de_bolsa: [],
  };
}

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  // La cadena también es una promesa; movimientos_bolsa responde según el estado filtrado.
  const consulta = (tabla: string) => {
    let filas: unknown = tablas[tabla] ?? [];
    const cadena: object = Object.assign(
      Promise.resolve().then(() => ({ data: filas, error: null })),
      {
        eq: (columna: string, valor: unknown) => {
          if (tabla === "movimientos_bolsa" && columna === "estado")
            filas = valor === "pendiente" ? tablas.pendientes : tablas.aportes;
          return cadena;
        },
        not: () => cadena,
        is: () => cadena,
        order: () => cadena,
        gte: () => cadena,
        lte: () => cadena,
        single: () => cadena,
      },
    );
    return cadena;
  };
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => ({ select: () => consulta(tabla) })),
    rpc: rpc.mockImplementation((nombre: string) =>
      nombre === "estado_metas"
        ? ok(estados)
        : nombre === "sugerir_aporte"
          ? ok([{ aportes: 12, aporte: 250_000, ultima_fecha: "2027-11-01" }])
          : ok(null),
    ),
  });
}

function abrir() {
  const router = createMemoryRouter([{ path: "/ahorros", Component: Ahorros }], {
    initialEntries: ["/ahorros"],
  });
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const abrirMenu = async (nombre: string) =>
  fireEvent.pointerDown(await screen.findByRole("button", { name: nombre }), {
    button: 0,
    ctrlKey: false,
  });
const elegir = async (accion: string) =>
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${accion}`) }));
const llamadas = (nombre: string) => rpc.mock.calls.filter(([n]) => n === nombre);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T15:00:00Z") });
  datos();
  falsoSupabase();
});
afterEach(() => vi.useRealTimers());

describe("Ahorros", () => {
  it("tarjetas de total, aportes del período y por confirmar; metas con estado en palabra", async () => {
    abrir();
    const viaje = (await screen.findByText("Viaje a Cartagena", { selector: "span" })).closest(
      "tr",
    )!;
    expect(within(viaje).getByText("$1.200.000 de $3.000.000")).toBeInTheDocument();
    expect(within(viaje).getByText("$250.000 / mes")).toBeInTheDocument();
    expect(within(viaje).getByText("Atrasada")).toBeInTheDocument();
    expect(within(viaje).getByText("40 %")).toBeInTheDocument();
    const fondo = screen.getByText("Fondo de emergencia").closest("tr")!;
    expect(within(fondo).getByText("Cumplida")).toBeInTheDocument();
    expect(within(fondo).getByText("Sin aporte periódico")).toBeInTheDocument();

    const kpi = (titulo: string) => screen.getByRole("heading", { name: titulo }).parentElement!;
    expect(within(kpi("Total ahorrado")).getByText("$6.200.000")).toBeInTheDocument();
    expect(await within(kpi("Aportes este período")).findByText("$350.000")).toBeInTheDocument();
    expect(within(kpi("Por confirmar")).getByText("$250.000")).toBeInTheDocument();
  });

  it("en el móvil, tarjetas con lo ahorrado y la fecha final", async () => {
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("Ahorrado $1.200.000 de $3.000.000")).toBeInTheDocument();
    expect(screen.getByText("Hasta el 30 jun 2027")).toBeInTheDocument();
  });

  it("sin metas, invita a crear la primera", async () => {
    estados = [];
    abrir();
    expect(await screen.findByText("Aún no tienes metas de ahorro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear meta" })).toBeInTheDocument();
  });

  it("si la consulta falla, explica y deja reintentar", async () => {
    rpc.mockImplementation(() =>
      Promise.resolve({ data: null, error: { code: "XX000", message: "falla" } }),
    );
    abrir();
    expect(
      await screen.findByText(/No pudimos cargar tus metas/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeInTheDocument();
  });

  it("confirma un aporte pendiente con el valor de la regla", async () => {
    abrir();
    const pendientes = await screen.findByRole("region", { name: "Aportes por confirmar" });
    expect(within(pendientes).getByText("5 nov · desde Nequi")).toBeInTheDocument();
    expect(within(pendientes).getByText("Pendiente")).toBeInTheDocument();
    fireEvent.click(within(pendientes).getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("confirmar_aporte", {
        p_movimiento_id: "p1",
        p_en_adelante: false,
      }),
    );
  });

  it("ajusta el valor y lo usa en adelante", async () => {
    abrir();
    await abrirMenu("Acciones del aporte a «Viaje a Cartagena»");
    await elegir("Ajustar valor y confirmar");
    const dialogo = await screen.findByRole("dialog", { name: "Ajustar aporte y confirmar" });
    expect(within(dialogo).getByText("La regla dice $250.000.")).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Aporte de esta vez"), {
      target: { value: "300000" },
    });
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: "Usar este valor en adelante" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar aporte" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("confirmar_aporte", {
        p_movimiento_id: "p1",
        p_valor: 300_000,
        p_en_adelante: true,
      }),
    );
  });

  it("omitir avisa que la fecha final no cambia", async () => {
    abrir();
    await abrirMenu("Acciones del aporte a «Viaje a Cartagena»");
    await elegir("Omitir esta vez");
    const dialogo = await screen.findByRole("alertdialog", { name: /Omitir el aporte del/ });
    expect(within(dialogo).getByText(/La fecha final no cambia/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Omitir esta vez" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("omitir_aporte", { p_movimiento_id: "p1" }),
    );
  });

  it("una meta cumplida no ofrece aportar, sí retirar para usarlo", async () => {
    abrir();
    await abrirMenu("Acciones de «Fondo de emergencia»");
    expect(
      await screen.findByRole("menuitem", { name: /Retirar para usarlo/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Registrar aporte/ })).not.toBeInTheDocument();
  });

  it("el retiro no pasa de lo ahorrado", async () => {
    abrir();
    await abrirMenu("Acciones de «Viaje a Cartagena»");
    await elegir("Retirar");
    const dialogo = await screen.findByRole("dialog", { name: "Retirar de «Viaje a Cartagena»" });
    fireEvent.change(within(dialogo).getByLabelText("Valor"), { target: { value: "2000000" } });
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Efectivo/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Retirar" }));
    expect(
      within(dialogo).getByText("No puedes retirar más de lo ahorrado ($1.200.000)."),
    ).toBeInTheDocument();
    expect(llamadas("retirar_meta")).toHaveLength(0);
  });

  it("aporte manual desde una bolsa", async () => {
    abrir();
    await abrirMenu("Acciones de «Viaje a Cartagena»");
    await elegir("Registrar aporte");
    const dialogo = await screen.findByRole("dialog", { name: "Aporte a «Viaje a Cartagena»" });
    fireEvent.change(within(dialogo).getByLabelText("Valor"), { target: { value: "50000" } });
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Efectivo/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar aporte" }));
    await waitFor(() => expect(llamadas("aportar_meta")).toHaveLength(1));
    expect(llamadas("aportar_meta")[0]![1]).toMatchObject({
      p_meta_id: "viaje",
      p_valor: 50_000,
      p_bolsa_id: "efe",
    });
  });

  it("eliminar con saldo pide a qué bolsa pasa el dinero", async () => {
    abrir();
    await abrirMenu("Acciones de «Viaje a Cartagena»");
    await elegir("Eliminar");
    const dialogo = await screen.findByRole("alertdialog", {
      name: "¿Eliminar «Viaje a Cartagena»?",
    });
    expect(within(dialogo).getByText(/Los \$1.200.000 ahorrados pasan/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar meta" }));
    expect(within(dialogo).getByText("Elige a qué bolsa pasa el dinero.")).toBeInTheDocument();
    expect(llamadas("eliminar_meta")).toHaveLength(0);
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Nequi/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar meta" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("eliminar_meta", { p_meta_id: "viaje", p_bolsa_id: "neq" }),
    );
  });

  it("nueva meta con el aporte sugerido como valor", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Nueva meta" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nueva meta de ahorro" });
    fireEvent.change(within(dialogo).getByLabelText("Nombre"), { target: { value: "Moto" } });
    fireEvent.change(within(dialogo).getByLabelText("Monto a alcanzar"), {
      target: { value: "3000000" },
    });
    expect(
      await within(dialogo).findByText(/Aporte sugerido: \$250.000 por mes\. Llegas a la meta el/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Nequi/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear meta" }));
    await waitFor(() => expect(llamadas("crear_meta")).toHaveLength(1));
    expect(llamadas("crear_meta")[0]![1]).toMatchObject({
      p_nombre: "Moto",
      p_monto: 3_000_000,
      p_fecha_final: "2027-11-25",
      p_valor: 250_000,
      p_frecuencia: "mensual",
      p_dia: 1,
      p_bolsa_id: "neq",
      p_saldo_inicial: 0,
    });
  });
});
