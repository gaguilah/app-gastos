import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { SelectorBolsa } from "./SelectorBolsa";

function falsoSupabase() {
  const resultado = <T,>(data: T) => Promise.resolve({ data, error: null });
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => {
      if (tabla === "saldos_bolsa")
        return {
          select: () =>
            resultado([
              { bolsa_id: "b1", saldo: 35000 },
              { bolsa_id: "b2", saldo: 412300 },
            ]),
        };
      if (tabla === "uso_bolsas") return { select: () => resultado([]) };
      return {
        select: () => ({
          not: () => ({
            eq: () =>
              resultado([
                { id: "b2", nombre: "Nequi" },
                { id: "b1", nombre: "Efectivo" },
              ]),
          }),
        }),
      };
    }),
  });
}

function abrir(props: Partial<Parameters<typeof SelectorBolsa>[0]> = {}) {
  const alCambiar = vi.fn();
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <SelectorBolsa etiqueta="Destino" valor={null} alCambiar={alCambiar} {...props} />
    </QueryClientProvider>,
  );
  return alCambiar;
}

describe("SelectorBolsa", () => {
  beforeEach(falsoSupabase);

  it("lista las bolsas por nombre con su saldo, después de las opciones extra", async () => {
    abrir({ extras: [{ valor: "presupuesto", etiqueta: "Presupuesto del período" }] });
    await screen.findByRole("radio", { name: /Nequi/ });
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByText(/^quedan/).map((e) => e.textContent)).toEqual([
      "quedan $35.000",
      "quedan $412.300",
    ]);
    expect(screen.getByRole("radio", { name: /Presupuesto del período/ })).toBeInTheDocument();
  });

  it("entrega la bolsa elegida", async () => {
    const alCambiar = abrir();
    fireEvent.click(await screen.findByRole("radio", { name: /Nequi/ }));
    expect(alCambiar).toHaveBeenCalledWith("b2");
  });

  it("no ofrece las bolsas excluidas", async () => {
    abrir({ excluir: ["b1"] });
    await screen.findByRole("radio", { name: /Nequi/ });
    expect(screen.queryByRole("radio", { name: /Efectivo/ })).not.toBeInTheDocument();
  });

  it("avisa si la salida deja la bolsa en negativo", async () => {
    abrir({ valor: "b1", salida: 50000 });
    expect(
      await screen.findByText("Efectivo quedaría en −$15.000. Puedes guardar de todas formas."),
    ).toBeInTheDocument();
  });
});
