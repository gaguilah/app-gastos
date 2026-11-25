import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { SelectorIconoColor } from "./SelectorIconoColor";
import { nombresIconos, paletaCategorias } from "./iconos-categoria";

function montar(icono = "utensils", color = "#b45309") {
  const alCambiarIcono = vi.fn();
  const alCambiarColor = vi.fn();
  render(
    <SelectorIconoColor
      icono={icono}
      color={color}
      alCambiarIcono={alCambiarIcono}
      alCambiarColor={alCambiarColor}
    />,
  );
  return { alCambiarIcono, alCambiarColor };
}

describe("SelectorIconoColor", () => {
  it("marca el ícono y el color elegidos y avisa al cambiarlos", () => {
    const { alCambiarIcono, alCambiarColor } = montar();
    expect(screen.getByRole("button", { name: "Comida" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ámbar" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Mascota" }));
    expect(alCambiarIcono).toHaveBeenCalledWith("paw-print");
    fireEvent.click(screen.getByRole("button", { name: "Índigo" }));
    expect(alCambiarColor).toHaveBeenCalledWith("#4343c8");
  });

  it("un color guardado fuera de la paleta sigue visible y elegido", () => {
    montar("utensils", "#123456");
    expect(screen.getByRole("button", { name: "Color actual" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("todos los íconos y colores tienen nombre en los dos idiomas", () => {
    for (const lng of ["es", "en"]) {
      for (const nombre of nombresIconos)
        expect(i18n.exists(`iconos.${nombre}`, { lng })).toBe(true);
      for (const { clave } of paletaCategorias)
        expect(i18n.exists(`colores.${clave}`, { lng })).toBe(true);
    }
  });
});
