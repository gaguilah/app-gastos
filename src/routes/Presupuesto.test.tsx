import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Presupuesto } from "./Presupuesto";

const tablas: Record<string, unknown> = {
  perfiles: {
    id: "yo",
    dia_inicio: 1,
    salario_base: 4_000_000,
    presupuesto_salario_base: 3_200_000,
    categoria_salario_id: null,
  },
  disponible_periodo: [
    {
      periodo_id: "oct",
      fecha_inicio: "2026-10-01",
      fecha_fin: "2026-10-31",
      presupuesto: 3_000_000,
      ingresos_presupuesto: 0,
      disponible: -104_000,
      salario: 4_000_000,
      salario_presupuesto: 3_000_000,
    },
    {
      periodo_id: "nov",
      fecha_inicio: "2026-11-01",
      fecha_fin: "2026-11-30",
      presupuesto: 3_400_000,
      ingresos_presupuesto: 200_000,
      disponible: 1_415_500,
      salario: 4_000_000,
      salario_presupuesto: 3_200_000,
    },
  ],
  periodos: [
    { id: "oct", cerrado_at: "2026-11-01T05:00:00Z", recerrado_at: null },
    { id: "nov", cerrado_at: null, recerrado_at: null },
  ],
};

const rpc = vi.fn();
const update = vi.fn();

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => ({
      select: () => Object.assign(ok(tablas[tabla]), { single: () => ok(tablas[tabla]) }),
      update: (datos: unknown) => ({
        eq: (_: string, id: string) => (update(tabla, datos, id), ok(null)),
      }),
    })),
    rpc: rpc.mockImplementation((nombre: string) =>
      ok(
        nombre === "vista_previa_periodos"
          ? [
              { orden: 1, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-30" },
              { orden: 2, fecha_inicio: "2026-12-01", fecha_fin: "2027-01-14" },
              { orden: 3, fecha_inicio: "2027-01-15", fecha_fin: "2027-02-14" },
            ]
          : null,
      ),
    ),
  });
}

function abrir() {
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <Presupuesto />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T15:00:00Z") });
  falsoSupabase();
});
afterEach(() => vi.useRealTimers());

describe("Presupuesto", () => {
  it("muestra la configuración y los períodos con uso y estado", async () => {
    abrir();
    expect(await screen.findByText("Día 1 · del 1 al fin de mes")).toBeInTheDocument();
    const nov = screen.getByText("1 – 30 nov 2026").closest("tr")!;
    // Presupuesto = 3.200.000 del salario + 200.000; usado = 3.400.000 − 1.415.500.
    expect(within(nov).getByText("$3.400.000")).toBeInTheDocument();
    expect(within(nov).getByText("$1.984.500")).toBeInTheDocument();
    expect(within(nov).getByText("58 %")).toBeInTheDocument();
    expect(within(nov).getByText("En curso")).toBeInTheDocument();
    expect(within(nov).getByText("Salario $3.200.000 + ingresos $200.000")).toBeInTheDocument();
    const oct = screen.getByText("1 – 31 oct 2026").closest("tr")!;
    expect(within(oct).getByText("103 %")).toBeInTheDocument();
    expect(within(oct).getByText("Superado")).toBeInTheDocument();
    expect(within(oct).queryByRole("button")).not.toBeInTheDocument();
  });

  it("en el móvil, tarjetas con la barra y el detalle", async () => {
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("Gastado $1.984.500 de $3.400.000")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustar este período" })).not.toBeInTheDocument();
  });

  it("cambiar el día de inicio muestra la vista previa y guarda en el perfil", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar día de inicio" }));
    const dialogo = await screen.findByRole("dialog", { name: "Día de inicio del período" });
    expect(within(dialogo).getByRole("radio", { name: "Día 1" })).toBeChecked();
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Día 15" }));
    expect(await within(dialogo).findByText("1 dic 2026 – 14 ene 2027")).toBeInTheDocument();
    expect(dialogo).toHaveTextContent("del 15 al 14 del mes siguiente");
    expect(rpc).toHaveBeenCalledWith("vista_previa_periodos", { p_dia: 15 });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("perfiles", { dia_inicio: 15 }, "yo"));
  });

  it("otro día valida 1 a 31 y avisa de los meses cortos", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar día de inicio" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Otro día…" }));
    const campo = within(dialogo).getByLabelText("Día del mes (1 a 31)");
    fireEvent.change(campo, { target: { value: "32" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(within(dialogo).getByText("Escribe un día entre 1 y 31.")).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "30" } });
    expect(within(dialogo).getByText(/el período empieza el último día/)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("si falla la carga, ofrece reintentar", async () => {
    Object.assign(supabase, {
      from: vi.fn(() => ({
        select: () =>
          Object.assign(Promise.resolve({ data: null, error: new Error("caída") }), {
            single: () => Promise.resolve({ data: null, error: new Error("caída") }),
          }),
      })),
    });
    abrir();
    // El cliente reintenta una vez antes de mostrar el error.
    expect(
      await screen.findByText(/No pudimos cargar tu presupuesto/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
