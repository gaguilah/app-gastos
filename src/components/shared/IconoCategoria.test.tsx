import { render } from "@testing-library/react";
import { IconoCategoria } from "./IconoCategoria";

describe("IconoCategoria", () => {
  it("pinta el ícono con el color de la categoría y es decorativo", () => {
    const { container } = render(<IconoCategoria icono="utensils" color="#b45309" />);
    const caja = container.firstElementChild as HTMLElement;
    expect(caja).toHaveAttribute("aria-hidden", "true");
    expect(caja.style.color).toBe("rgb(180, 83, 9)");
    expect(caja.querySelector("svg")).toHaveClass("lucide-utensils");
  });

  it("un ícono desconocido se muestra como «Otros»", () => {
    const { container } = render(<IconoCategoria icono="no-existe" color={null} />);
    expect(container.querySelector("svg")).toHaveClass("lucide-ellipsis");
  });
});
