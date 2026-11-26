import { render, screen } from "@testing-library/react";
import { BarraPresupuesto } from "./BarraPresupuesto";

describe("BarraPresupuesto", () => {
  it("escribe el porcentaje y lo gastado de la base", () => {
    render(<BarraPresupuesto usado={1984500} base={3200000} />);
    expect(screen.getByText("62 %")).toBeInTheDocument();
    expect(screen.getByText("Gastado $1.984.500 de $3.200.000")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Gastado $1.984.500 de $3.200.000",
    );
  });

  it("debajo del 70 % usa el color normal", () => {
    const { container } = render(<BarraPresupuesto usado={600000} base={1000000} />);
    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass("bg-primary");
  });

  it("desde el 70 % toma el token del último umbral alcanzado", () => {
    const { container } = render(<BarraPresupuesto usado={912000} base={1000000} />);
    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass("bg-alerta-90");
    expect(screen.getByText("91 %")).toHaveClass("text-alerta-90");
  });

  it("por encima del 100 % usa alerta-superado y llena la barra", () => {
    const { container } = render(
      <BarraPresupuesto usado={3104000} base={3000000} conDetalle={false} />,
    );
    expect(screen.getByText("103 %")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveClass(
      "bg-alerta-superado",
    );
    expect(screen.queryByText(/Gastado/)).not.toBeInTheDocument();
  });
});
