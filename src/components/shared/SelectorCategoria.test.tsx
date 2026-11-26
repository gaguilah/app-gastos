import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { SelectorCategoria, type ValorCategoria } from "./SelectorCategoria";

const filas = [
  {
    id: "c1",
    nombre: "Salario",
    icono: "briefcase",
    color: "#047857",
    tipo: "ingreso",
    clave_sistema: null,
    padre_id: null,
  },
  {
    id: "s1",
    nombre: "Prima",
    icono: null,
    color: null,
    tipo: "ingreso",
    clave_sistema: null,
    padre_id: "c1",
  },
  {
    id: "c2",
    nombre: "Venta",
    icono: "tag",
    color: "#047857",
    tipo: "ingreso",
    clave_sistema: null,
    padre_id: null,
  },
  {
    id: "c3",
    nombre: "Mercado",
    icono: "utensils",
    color: "#b45309",
    tipo: "gasto",
    clave_sistema: null,
    padre_id: null,
  },
];

function Prueba({ alCambiar }: { alCambiar: (v: ValorCategoria) => void }) {
  const [valor, setValor] = useState<ValorCategoria>({ categoria: null, subcategoria: null });
  return (
    <SelectorCategoria
      etiqueta="Categoría de ingreso"
      tipo="ingreso"
      valor={valor}
      alCambiar={(v) => {
        setValor(v);
        alCambiar(v);
      }}
    />
  );
}

describe("SelectorCategoria", () => {
  beforeEach(() => {
    const resultado = <T,>(data: T) => Promise.resolve({ data, error: null });
    Object.assign(supabase, {
      from: vi.fn((tabla: string) =>
        tabla === "uso_categorias"
          ? { select: () => resultado([]) }
          : { select: () => ({ eq: () => resultado(filas) }) },
      ),
    });
  });

  it("solo ofrece las categorías del tipo pedido y la subcategoría de la elegida", async () => {
    const alCambiar = vi.fn();
    render(
      <QueryClientProvider client={crearClienteConsultas()}>
        <Prueba alCambiar={alCambiar} />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("radio", { name: "Salario" }));
    expect(screen.queryByRole("radio", { name: "Mercado" })).not.toBeInTheDocument();
    expect(alCambiar).toHaveBeenLastCalledWith({ categoria: "c1", subcategoria: null });
    fireEvent.click(screen.getByRole("radio", { name: "Prima" }));
    expect(alCambiar).toHaveBeenLastCalledWith({ categoria: "c1", subcategoria: "s1" });
    fireEvent.click(screen.getByRole("radio", { name: "Ninguna" }));
    expect(alCambiar).toHaveBeenLastCalledWith({ categoria: "c1", subcategoria: null });
  });
});
