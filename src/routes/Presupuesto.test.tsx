import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
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
      <MemoryRouter>
        <Presupuesto />
      </MemoryRouter>
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

  it("el período en curso muestra el desglose: salario + ingresos, gastado y disponible", async () => {
    abrir();
    const tarjeta = (await screen.findByRole("heading", { name: "Período en curso" })).closest(
      "section",
    )!;
    expect(tarjeta).toHaveTextContent("1 – 30 nov 2026 · salario $4.000.000");
    for (const [etiqueta, valor] of [
      ["Del salario", "$3.200.000"],
      ["Ingresos que suman", "$200.000"],
      ["Presupuesto", "$3.400.000"],
      ["Gastado", "$1.984.500"],
      ["Disponible", "$1.415.500"],
    ] as const)
      expect(within(tarjeta).getByText(etiqueta).nextSibling).toHaveTextContent(valor);
    expect(within(tarjeta).getByText("58 %")).toBeInTheDocument();
    expect(within(tarjeta).queryByText(/Hoy se cierra/)).not.toBeInTheDocument();
  });

  it("el último día del período aparece la franja de cierre (S10)", async () => {
    vi.setSystemTime(new Date("2026-11-30T15:00:00Z"));
    abrir();
    expect(
      await screen.findByText("Hoy se cierra el período, recuerda registrar todo."),
    ).toBeInTheDocument();
  });

  it("sin ingresos no hay % ni estado de uso e invita a registrar un ingreso (decisión 4)", async () => {
    const original = tablas.disponible_periodo;
    tablas.disponible_periodo = [
      {
        periodo_id: "nov",
        fecha_inicio: "2026-11-01",
        fecha_fin: "2026-11-30",
        presupuesto: 0,
        ingresos_presupuesto: 0,
        disponible: -50_000,
        salario: 0,
        salario_presupuesto: 0,
      },
    ];
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("Este período aún no tiene presupuesto.")).toBeInTheDocument();
    expect(
      screen.getByText(/Los gastos se registran igual \(\$50\.000 hasta ahora\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar ingreso" })).toHaveAttribute(
      "href",
      "/ingresos?nuevo=1",
    );
    expect(screen.getByText("Sin presupuesto · gastado $50.000")).toBeInTheDocument();
    expect(screen.queryByText(/ %$/)).not.toBeInTheDocument();
    tablas.disponible_periodo = original;
  });

  it("muestra el salario base y lo cambia, también en el período actual", async () => {
    abrir();
    const config = (await screen.findByRole("heading", { name: "Configuración" })).closest(
      "section",
    )!;
    expect(config).toHaveTextContent("$4.000.000$3.200.000 al presupuesto");
    fireEvent.click(within(config).getByRole("button", { name: "Cambiar salario" }));
    const dialogo = await screen.findByRole("dialog", { name: "Salario base" });
    expect(within(dialogo).getByLabelText("Salario del período")).toHaveValue("4.000.000");
    expect(within(dialogo).getByRole("checkbox", { name: /Usar también/ })).not.toBeChecked();
    fireEvent.change(within(dialogo).getByLabelText("Para el presupuesto"), {
      target: { value: "4500000" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    expect(
      await within(dialogo).findByText("Escribe un monto de $0 hasta el salario."),
    ).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Salario del período"), {
      target: { value: "4500000" },
    });
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Usar también/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("configurar_salario", {
        p_salario: 4_500_000,
        p_presupuesto: 4_500_000,
        p_categoria_id: undefined,
        p_actual: true,
      }),
    );
  });

  it("sin salario base invita a configurarlo y lo marca para el período actual", async () => {
    const original = tablas.perfiles;
    tablas.perfiles = { ...(original as object), salario_base: 0, presupuesto_salario_base: 0 };
    abrir();
    expect(
      await screen.findByText("Sin configurar: los períodos empiezan sin salario."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Configurar salario" }));
    const dialogo = await screen.findByRole("dialog", { name: "Salario base" });
    expect(within(dialogo).getByRole("checkbox", { name: /Usar también/ })).toBeChecked();
    tablas.perfiles = original;
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
