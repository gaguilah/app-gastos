import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CampoMonto } from "./CampoMonto";

function Prueba({
  negativo,
  alCambiar,
}: {
  negativo?: boolean;
  alCambiar: (v: number | null) => void;
}) {
  const [valor, setValor] = useState<number | null>(null);
  return (
    <CampoMonto
      etiqueta="Valor"
      valor={valor}
      negativo={negativo}
      ayuda="Nequi · quedan $35.000"
      alCambiar={(v) => {
        setValor(v);
        alCambiar(v);
      }}
    />
  );
}

describe("CampoMonto", () => {
  it("pone los puntos de miles mientras se escribe y entrega pesos enteros", () => {
    const alCambiar = vi.fn();
    render(<Prueba alCambiar={alCambiar} />);
    const campo = screen.getByLabelText("Valor");
    fireEvent.change(campo, { target: { value: "35000" } });
    expect(campo).toHaveValue("35.000");
    expect(alCambiar).toHaveBeenLastCalledWith(35000);
  });

  it("ignora letras y comas, y vacío es null", () => {
    const alCambiar = vi.fn();
    render(<Prueba alCambiar={alCambiar} />);
    const campo = screen.getByLabelText("Valor");
    fireEvent.change(campo, { target: { value: "12a,5" } });
    expect(campo).toHaveValue("125");
    fireEvent.change(campo, { target: { value: "" } });
    expect(alCambiar).toHaveBeenLastCalledWith(null);
  });

  it("usa el teclado numérico y muestra la ayuda", () => {
    render(<Prueba alCambiar={vi.fn()} />);
    const campo = screen.getByLabelText("Valor");
    expect(campo).toHaveAttribute("inputmode", "numeric");
    expect(campo).toHaveAccessibleDescription("Nequi · quedan $35.000");
  });

  it("acepta negativos solo si se pide", () => {
    const alCambiar = vi.fn();
    render(<Prueba negativo alCambiar={alCambiar} />);
    const campo = screen.getByLabelText("Valor");
    fireEvent.change(campo, { target: { value: "-200000" } });
    expect(campo).toHaveValue("−200.000");
    expect(alCambiar).toHaveBeenLastCalledWith(-200000);
  });
});
