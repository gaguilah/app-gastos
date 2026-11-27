import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { CierrePeriodo } from "./CierrePeriodo";

vi.mock("@/datos/ahorros", async (original) => ({
  ...(await original<typeof import("@/datos/ahorros")>()),
  useMetas: () => ({ data: [{ id: "viaje", nombre: "Viaje" }] }),
}));
vi.mock("@/datos/bolsas", async (original) => ({
  ...(await original<typeof import("@/datos/bolsas")>()),
  useBolsas: () => ({ data: [{ id: "efe", nombre: "Efectivo" }] }),
}));

// Escenarios de la spec: salario 4.000.000 con 3.000.000 al presupuesto, gastado 2.500.000.
const cierreBase = {
  periodo_id: "oct",
  fecha_inicio: "2026-10-01",
  fecha_fin: "2026-10-31",
  cerrado_at: "2026-11-01T05:00:00Z",
  recerrado_at: null as string | null,
  salario: 4_000_000,
  salario_presupuesto: 3_000_000,
  presupuesto: 3_000_000,
  disponible: 500_000,
  sobrante_salario: 1_000_000,
  sobrante_presupuesto: 500_000,
  excedido: 0,
  destinado_salario: 0,
  destinado_presupuesto: 300_000,
  no_destinado_salario: 1_000_000,
  no_destinado_presupuesto: 200_000,
};

let tablas: Record<string, unknown>;
const rpc = vi.fn();

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => {
      const cadena = Object.assign(ok(tablas[tabla]), {
        eq: () => cadena,
        order: () => cadena,
        single: () => ok(tablas[tabla]),
      });
      return { select: () => cadena };
    }),
    rpc: rpc.mockImplementation(() => ok(null)),
  });
}

function abrir() {
  const router = createMemoryRouter(
    [
      { path: "/presupuesto/:periodoId", Component: CierrePeriodo },
      { path: "/presupuesto", Component: () => <p>Pantalla de presupuesto</p> },
    ],
    { initialEntries: ["/presupuesto/oct"] },
  );
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  tablas = {
    cierre_periodos: { ...cierreBase },
    destinos_sobrante: [
      {
        id: "d1",
        origen: "presupuesto",
        fecha: "2026-11-02",
        valor: 300_000,
        nota: null,
        bolsa_id: "b-viaje",
        meta_id: "viaje",
        destino_nombre: "Viaje",
        meta_icono: "plane",
      },
    ],
    periodos: {
      resumen: {
        bolsas: [
          { bolsa_id: "efe", nombre: "Efectivo", saldo: 35_000 },
          { bolsa_id: "neq", nombre: "Nequi", saldo: -10_000 },
        ],
      },
    },
  };
  falsoSupabase();
});

const tarjeta = (nombre: string) => screen.getByRole("region", { name: nombre });

describe("Cierre del período", () => {
  it("informa por separado el sobrante del salario, el del presupuesto y cada bolsa", async () => {
    abrir();
    expect(await screen.findByText("1 – 31 oct 2026")).toBeInTheDocument();
    expect(screen.getByText(/^Cerrado el domingo, 1 de noviembre de 2026/)).toBeInTheDocument();

    const salario = tarjeta("Sobrante del salario");
    expect(salario).toHaveTextContent("$1.000.000");
    expect(salario).toHaveTextContent("Salario $4.000.000 − $3.000.000 al presupuesto");
    expect(within(salario).getByText("No destinado").nextSibling).toHaveTextContent("$1.000.000");

    const presupuesto = tarjeta("Sobrante del presupuesto");
    expect(presupuesto).toHaveTextContent("Presupuesto $3.000.000 − usado $2.500.000");
    expect(within(presupuesto).getByText("Destinado").nextSibling).toHaveTextContent("$300.000");
    expect(within(presupuesto).getByText("No destinado").nextSibling).toHaveTextContent("$200.000");

    const bolsas = tarjeta("Disponible en cada bolsa");
    expect(within(bolsas).getByText("Efectivo").nextSibling).toHaveTextContent("$35.000");
    expect(within(bolsas).getByText("Nequi").nextSibling).toHaveTextContent("−$10.000");

    const destinos = tarjeta("Destinos");
    expect(destinos).toHaveTextContent("ViajeDel presupuesto$300.000");
  });

  it("si te pasaste lo dice, sin tocar el sobrante del salario (S5)", async () => {
    tablas.cierre_periodos = {
      ...cierreBase,
      disponible: -200_000,
      sobrante_presupuesto: 0,
      excedido: 200_000,
      destinado_presupuesto: 0,
      no_destinado_presupuesto: 0,
    };
    tablas.destinos_sobrante = [];
    abrir();
    const presupuesto = await screen.findByRole("region", { name: "Sobrante del presupuesto" });
    expect(presupuesto).toHaveTextContent("Te pasaste por $200.000");
    expect(tarjeta("Sobrante del salario")).toHaveTextContent("$1.000.000");
    expect(tarjeta("Destinos")).toHaveTextContent("Aún no has destinado nada.");
  });

  it("un sobrante negativo por un gasto atrasado se advierte (decisión 8)", async () => {
    tablas.cierre_periodos = { ...cierreBase, no_destinado_presupuesto: -50_000 };
    abrir();
    const presupuesto = await screen.findByRole("region", { name: "Sobrante del presupuesto" });
    expect(within(presupuesto).getByText("No destinado").nextSibling).toHaveTextContent("−$50.000");
    expect(presupuesto).toHaveTextContent(/dejó este sobrante en negativo/);
  });

  it("un período abierto no se destina ni se vuelve a cerrar", async () => {
    tablas.cierre_periodos = { ...cierreBase, cerrado_at: null };
    tablas.periodos = { resumen: null };
    abrir();
    expect(await screen.findByText(/^Abierto: se cierra solo el sábado, 31/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Destinar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Volver a cerrar" })).not.toBeInTheDocument();
    expect(tarjeta("Disponible en cada bolsa")).toHaveTextContent(
      "Aparece cuando el período se cierra.",
    );
  });

  it("volver a cerrar llama a la base de datos", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Volver a cerrar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("volver_a_cerrar", { p_periodo_id: "oct" }),
    );
  });

  it("destina a una meta y a una bolsa, con lo que queda sin destinar (decisión 7)", async () => {
    tablas.cierre_periodos = {
      ...cierreBase,
      destinado_presupuesto: 0,
      no_destinado_presupuesto: 500_000,
    };
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Destinar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Destinar sobrante" });
    expect(within(dialogo).getByRole("radio", { name: /Del presupuesto/ })).toBeChecked();
    expect(dialogo).toHaveTextContent("quedan $1.000.000");

    fireEvent.change(within(dialogo).getByRole("combobox", { name: "Destino 1" }), {
      target: { value: "meta:viaje" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Valor del destino 1"), {
      target: { value: "300000" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar otro destino" }));
    fireEvent.change(within(dialogo).getByRole("combobox", { name: "Destino 2" }), {
      target: { value: "bolsa:efe" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Valor del destino 2"), {
      target: { value: "300000" },
    });
    expect(dialogo).toHaveTextContent("Te pasas por $100.000 de lo que sobra.");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Destinar" }));
    expect(rpc).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText("Valor del destino 2"), {
      target: { value: "100000" },
    });
    expect(dialogo).toHaveTextContent("Queda sin destinar: $100.000");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Destinar" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc).toHaveBeenNthCalledWith(1, "destinar_sobrante", {
      p_periodo_id: "oct",
      p_origen: "presupuesto",
      p_valor: 300_000,
      p_bolsa_id: undefined,
      p_meta_id: "viaje",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "destinar_sobrante", {
      p_periodo_id: "oct",
      p_origen: "presupuesto",
      p_valor: 100_000,
      p_bolsa_id: "efe",
      p_meta_id: undefined,
    });
  });

  it("pide destino y valor en cada fila", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Destinar" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Destinar" }));
    expect(within(dialogo).getByText("Elige a dónde va.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Escribe un valor mayor que $0.")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("edita y quita un destino", async () => {
    abrir();
    const destinos = await screen.findByRole("region", { name: "Destinos" });
    fireEvent.pointerDown(within(destinos).getByRole("button", { name: "Acciones de «Viaje»" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar valor" }));
    const editar = await screen.findByRole("dialog", { name: "Editar destino" });
    fireEvent.change(within(editar).getByLabelText("Valor destinado a Viaje"), {
      target: { value: "250000" },
    });
    fireEvent.click(within(editar).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("editar_destino", {
        p_movimiento_id: "d1",
        p_valor: 250_000,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.pointerDown(within(destinos).getByRole("button", { name: "Acciones de «Viaje»" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Quitar destino" }));
    const quitar = await screen.findByRole("alertdialog", { name: "¿Quitar este destino?" });
    expect(quitar).toHaveTextContent("$300.000 sale de Viaje y vuelve a «No destinado».");
    fireEvent.click(within(quitar).getByRole("button", { name: "Quitar" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("eliminar_destino", { p_movimiento_id: "d1" }),
    );
  });
});
