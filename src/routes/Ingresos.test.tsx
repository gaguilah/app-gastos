import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { toast } from "sonner";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Ingresos } from "./Ingresos";

const ingresoBase = {
  descripcion: null,
  subcategoria_id: null,
  subcategoria_nombre: null,
  categoria_icono: "briefcase",
  categoria_color: "#0f766e",
  cuenta_estadisticas: true,
  prestamo_id: null,
  deuda_id: null,
  es_salario: false,
  monto_presupuesto: null,
  suma_presupuesto: false,
};

let tablas: Record<string, unknown>;
const rpc = vi.fn();
const escrito = vi.fn();
const rangos: string[][] = [];

function datos() {
  tablas = {
    perfiles: {
      id: "yo",
      dia_inicio: 1,
      salario_base: 4_200_000,
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
        disponible: 100_000,
      },
      {
        periodo_id: "nov",
        fecha_inicio: "2026-11-01",
        fecha_fin: "2026-11-30",
        presupuesto: 3_200_000,
        ingresos_presupuesto: 4_200_000,
        disponible: 5_000_000,
      },
    ],
    periodos: [
      { id: "oct", cerrado_at: "2026-11-01T05:00:00Z", nota_presupuesto: null },
      { id: "nov", cerrado_at: null, nota_presupuesto: null },
    ],
    bolsas: [
      { id: "efe", nombre: "Efectivo" },
      { id: "neq", nombre: "Nequi" },
    ],
    saldos_bolsa: [
      { bolsa_id: "efe", saldo: 35_000 },
      { bolsa_id: "neq", saldo: 412_300 },
    ],
    uso_bolsas: [],
    categorias: [
      {
        id: "sal",
        nombre: "Salario",
        icono: "briefcase",
        color: "#0f766e",
        tipo: "ingreso",
        clave_sistema: null,
        padre_id: null,
      },
      {
        id: "ext",
        nombre: "Trabajos extra",
        icono: "hammer",
        color: "#0f766e",
        tipo: "ingreso",
        clave_sistema: null,
        padre_id: null,
      },
      {
        id: "ali",
        nombre: "Alimentación",
        icono: "utensils",
        color: "#0f766e",
        tipo: "gasto",
        clave_sistema: null,
        padre_id: null,
      },
    ],
    uso_categorias: [],
    ingresos: [
      {
        ...ingresoBase,
        id: "i1",
        titulo: "Freelance: logo",
        fecha: "2026-11-09",
        valor: 350_000,
        categoria_id: "ext",
        categoria_nombre: "Trabajos extra",
        bolsa_id: "neq",
        bolsa: { nombre: "Nequi" },
      },
      {
        ...ingresoBase,
        id: "i2",
        titulo: "Salario de noviembre",
        fecha: "2026-11-01",
        valor: 4_200_000,
        categoria_id: "sal",
        categoria_nombre: "Salario",
        bolsa_id: null,
        bolsa: null,
        es_salario: true,
        monto_presupuesto: 4_200_000,
      },
      {
        ...ingresoBase,
        id: "i3",
        titulo: "Préstamo de Camila",
        fecha: "2026-11-02",
        valor: 1_000_000,
        categoria_id: "sal",
        categoria_nombre: "Salario",
        bolsa_id: "neq",
        bolsa: { nombre: "Nequi" },
        cuenta_estadisticas: false,
        prestamo_id: "p1",
      },
    ],
  };
}

function falsoSupabase() {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  const consulta = (tabla: string) => {
    const filas = tablas[tabla];
    const rango: string[] = [];
    const cadena = Object.assign(ok(filas), {
      eq: () => cadena,
      not: () => cadena,
      order: () => cadena,
      single: () => ok(filas),
      gte: (_: string, v: string) => (rango.push(v), cadena),
      lte: (_: string, v: string) => (rango.push(v), rangos.push(rango), cadena),
    });
    return cadena;
  };
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => ({
      select: () => consulta(tabla),
      insert: (fila: unknown) => (escrito("insert", tabla, fila), ok(null)),
      update: (fila: unknown) => ({
        eq: (_: string, id: string) => (escrito("update", id, fila), ok(null)),
      }),
      delete: () => ({ eq: (_: string, id: string) => (escrito("delete", id), ok(null)) }),
    })),
    rpc: rpc.mockResolvedValue({ data: null, error: null }),
  });
}

function abrir(ruta = "/ingresos") {
  const router = createMemoryRouter([{ path: "/ingresos", Component: Ingresos }], {
    initialEntries: [ruta],
  });
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

beforeEach(() => {
  vi.clearAllMocks();
  rangos.length = 0;
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T15:00:00Z") });
  datos();
  falsoSupabase();
});
afterEach(() => vi.useRealTimers());

describe("Ingresos", () => {
  it("lista del período actual con totales que no cuentan el préstamo", async () => {
    abrir();
    const fila = (await screen.findByText("Freelance: logo")).closest("tr")!;
    expect(within(fila).getByText("Nequi")).toBeInTheDocument();
    expect(within(fila).getByText("+$350.000")).toBeInTheDocument();
    expect(screen.getByText("1 – 30 nov 2026 · 3 ingresos")).toBeInTheDocument();
    expect(screen.getByText("+$4.550.000")).toBeInTheDocument();
    expect(screen.getByText("+$4.200.000", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("+$350.000", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Préstamo")).toBeInTheDocument();
    expect(rangos.at(-1)).toEqual(["2026-11-01", "2026-11-30"]);
  });

  it("‹ va al período anterior", async () => {
    abrir();
    await screen.findByText("Freelance: logo");
    expect(screen.getByRole("button", { name: "Período siguiente" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Período anterior" }));
    await waitFor(() => expect(rangos.at(-1)).toEqual(["2026-10-01", "2026-10-31"]));
  });

  it("en el móvil, tarjetas con «→ destino»", async () => {
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("→ Salario")).toBeInTheDocument();
    expect(screen.getAllByText("→ Nequi")).toHaveLength(2);
    expect(screen.getByText("1 nov · Salario")).toBeInTheDocument();
  });

  it("vacío: invita a registrar", async () => {
    tablas.ingresos = [];
    abrir();
    expect(await screen.findByText("Aún no hay ingresos en este período")).toBeInTheDocument();
  });

  it("nuevo ingreso: solo categorías de ingreso, destino Nequi y fecha futura rechazada", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    expect(await within(dialogo).findByRole("radio", { name: /Salario/ })).toBeInTheDocument();
    expect(within(dialogo).queryByRole("radio", { name: /Alimentación/ })).not.toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Valor"), { target: { value: "350000" } });
    fireEvent.change(within(dialogo).getByLabelText("Título"), {
      target: { value: "Freelance: web" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Fecha"), { target: { value: "2026-11-26" } });
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Trabajos extra/ }));
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Nequi/ }));
    expect(
      within(dialogo).getByText("Entra a la bolsa Nequi. El presupuesto del período no cambia."),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar ingreso" }));
    expect(await within(dialogo).findByText("La fecha no puede ser futura.")).toBeInTheDocument();
    expect(escrito).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Fecha"), { target: { value: "2026-11-25" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar ingreso" }));
    await waitFor(() =>
      expect(escrito).toHaveBeenCalledWith("insert", "ingresos", {
        titulo: "Freelance: web",
        fecha: "2026-11-25",
        valor: 350_000,
        descripcion: null,
        categoria_id: "ext",
        subcategoria_id: null,
        bolsa_id: "neq",
        es_salario: false,
        monto_presupuesto: null,
        suma_presupuesto: false,
        categoria_nombre: "",
      }),
    );
  });

  it("los campos vacíos se marcan uno por uno", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar ingreso" }));
    expect(await within(dialogo).findByText("Escribe un valor mayor que $0.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Escribe un título.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Elige una categoría.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Elige una bolsa o «Ninguna bolsa».")).toBeInTheDocument();
  });

  it("desde Recargar llega con la bolsa como destino", async () => {
    abrir("/ingresos?nuevo=1&destino=efe");
    const dialogo = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    expect(await within(dialogo).findByRole("radio", { name: /Efectivo/ })).toBeChecked();
  });

  it("editar: de Nequi a ninguna bolsa y que sume al presupuesto", async () => {
    abrir();
    await abrirMenu("Freelance: logo");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar ingreso" });
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Ninguna bolsa/ }));
    expect(within(dialogo).getByText(/No cambia el presupuesto ni las bolsas/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: "Suma al presupuesto" }));
    expect(
      within(dialogo).getByText("Suma al presupuesto del período. Ninguna bolsa cambia."),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(escrito).toHaveBeenCalledWith(
        "update",
        "i1",
        expect.objectContaining({ bolsa_id: null, suma_presupuesto: true, valor: 350_000 }),
      ),
    );
    expect(rpc).toHaveBeenCalledWith("advertencia_sobrante", { p_fecha: "2026-11-09" });
    expect(screen.queryByRole("radio", { name: "Desde ahora (nuevo salario base)" })).toBeNull();
  });

  it("una bolsa y «Suma al presupuesto» van juntas", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Nequi/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: "Suma al presupuesto" }));
    expect(
      within(dialogo).getByText("Entra a la bolsa Nequi y suma al presupuesto del período."),
    ).toBeInTheDocument();
  });

  it("nuevo salario: sin bolsa, con su parte para el presupuesto y el texto de las quincenas", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: "Es salario" }));
    expect(within(dialogo).queryByRole("radio", { name: /Nequi/ })).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/suma todos los pagos del período/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Salario del período"), {
      target: { value: "4000000" },
    });
    const parte = within(dialogo).getByLabelText("Para el presupuesto");
    fireEvent.change(parte, { target: { value: "4100000" } });
    fireEvent.change(within(dialogo).getByLabelText("Título"), { target: { value: "Salario" } });
    fireEvent.click(await within(dialogo).findByRole("radio", { name: /Salario/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar ingreso" }));
    expect(
      await within(dialogo).findByText("Escribe un valor entre $0 y el salario."),
    ).toBeInTheDocument();
    fireEvent.change(parte, { target: { value: "3000000" } });
    expect(
      within(dialogo).getByText(
        "Suma $3.000.000 al presupuesto del período. $1.000.000 quedan como sobrante del salario.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar ingreso" }));
    await waitFor(() =>
      expect(escrito).toHaveBeenCalledWith(
        "insert",
        "ingresos",
        expect.objectContaining({
          valor: 4_000_000,
          es_salario: true,
          monto_presupuesto: 3_000_000,
          bolsa_id: null,
          suma_presupuesto: false,
        }),
      ),
    );
    expect(rpc).not.toHaveBeenCalledWith("configurar_salario", expect.anything());
  });

  it("editar el salario «Desde ahora» cambia también el salario base", async () => {
    abrir();
    await abrirMenu("Salario de noviembre");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar ingreso" });
    expect(within(dialogo).getByRole("checkbox", { name: "Es salario" })).toBeChecked();
    expect(within(dialogo).getByRole("radio", { name: "Solo este período" })).toBeChecked();
    fireEvent.change(within(dialogo).getByLabelText("Salario del período"), {
      target: { value: "4500000" },
    });
    fireEvent.click(
      within(dialogo).getByRole("radio", { name: "Desde ahora (nuevo salario base)" }),
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("configurar_salario", {
        p_salario: 4_500_000,
        p_presupuesto: 4_200_000,
      }),
    );
    expect(escrito).toHaveBeenCalledWith(
      "update",
      "i2",
      expect.objectContaining({ valor: 4_500_000, es_salario: true, monto_presupuesto: 4_200_000 }),
    );
  });

  it("si un cierre queda en negativo, guarda y advierte (decisión 8)", async () => {
    const advertir = vi.spyOn(toast, "warning");
    rpc.mockImplementation((nombre: string) =>
      Promise.resolve({ data: nombre === "advertencia_sobrante", error: null }),
    );
    abrir();
    await abrirMenu("Freelance: logo");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar ingreso" }));
    await waitFor(() =>
      expect(advertir).toHaveBeenCalledWith(expect.stringMatching(/quedó en negativo/)),
    );
    expect(escrito).toHaveBeenCalledWith("delete", "i1");
  });

  it("eliminar dice cuánto baja la bolsa", async () => {
    abrir();
    await abrirMenu("Freelance: logo");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialogo = await screen.findByRole("alertdialog", {
      name: "¿Eliminar «Freelance: logo»?",
    });
    expect(
      await within(dialogo).findByText(/Nequi baja de \$412.300 a \$62.300/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar ingreso" }));
    await waitFor(() => expect(escrito).toHaveBeenCalledWith("delete", "i1"));
  });

  it("el ingreso de un préstamo no se edita aquí", async () => {
    abrir();
    await abrirMenu("Préstamo de Camila");
    const editar = await screen.findByRole("menuitem", { name: /^Editar/ });
    expect(editar).toHaveAttribute("aria-disabled", "true");
    expect(editar).toHaveTextContent("Se edita desde su préstamo o deuda");
  });

  it("detalle con fecha completa y efecto", async () => {
    abrir();
    await abrirMenu("Freelance: logo");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Ver detalle" }));
    const dialogo = await screen.findByRole("dialog", { name: "Detalle del ingreso" });
    expect(within(dialogo).getByText("Lunes, 9 de noviembre de 2026")).toBeInTheDocument();
    expect(within(dialogo).getByText("Sumó $350.000 a Nequi")).toBeInTheDocument();
  });
});
