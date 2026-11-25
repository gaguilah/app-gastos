import { fireEvent, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { Estado, EstadoCarga, EstadoError } from "./Estado";

describe("estados de pantalla", () => {
  it("vacío: título, qué hacer y la acción principal", () => {
    render(
      <Estado Icono={Inbox} titulo="Aún no hay gastos" mensaje="Registra el primero.">
        <button>Registrar gasto</button>
      </Estado>,
    );
    expect(screen.getByText("Aún no hay gastos")).toBeInTheDocument();
    expect(screen.getByText("Registra el primero.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar gasto" })).toBeInTheDocument();
  });

  it("error: se anuncia, dice qué pasó y Reintentar vuelve a intentar", () => {
    const alReintentar = vi.fn();
    render(<EstadoError alReintentar={alReintentar} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar esto");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(alReintentar).toHaveBeenCalledOnce();
  });

  it("carga: esqueletos con un texto para el lector de pantalla", () => {
    const { container } = render(<EstadoCarga filas={4} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(4 * 4); // 4 filas de 4 bloques;
  });
});
