import { fireEvent, render, screen } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { ponerMovil } from "@/test/setup";
import { MenuAcciones, type Accion } from "./MenuAcciones";

function acciones(alEditar = vi.fn(), alEliminar = vi.fn(), deshabilitada?: string): Accion[] {
  return [
    {
      clave: "eliminar",
      etiqueta: "Eliminar",
      icono: <Trash2 />,
      alElegir: alEliminar,
      destructiva: true,
      deshabilitada,
    },
    { clave: "editar", etiqueta: "Editar", icono: <Pencil />, alElegir: alEditar },
  ];
}

describe("MenuAcciones", () => {
  it("en computador abre un menú flotante con borrar al final", async () => {
    const alEditar = vi.fn();
    render(
      <MenuAcciones titulo="Café" etiqueta="Acciones de «Café»" acciones={acciones(alEditar)} />,
    );
    const boton = screen.getByRole("button", { name: "Acciones de «Café»" });
    fireEvent.pointerDown(boton, { button: 0, ctrlKey: false });
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Editar", "Eliminar"]);
    fireEvent.click(items[0]!);
    expect(alEditar).toHaveBeenCalledOnce();
  });

  it("en el móvil abre una hoja inferior con el nombre del registro", async () => {
    ponerMovil(true);
    const alEliminar = vi.fn();
    render(
      <MenuAcciones
        titulo="Café"
        etiqueta="Acciones de «Café»"
        acciones={acciones(vi.fn(), alEliminar)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Acciones de «Café»" }));
    expect(await screen.findByRole("heading", { name: "Café" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(alEliminar).toHaveBeenCalledOnce();
  });

  it("una acción que no se puede muestra el motivo y no se ejecuta", async () => {
    ponerMovil(true);
    const alEliminar = vi.fn();
    render(
      <MenuAcciones
        titulo="Gasto desconocido"
        etiqueta="Acciones"
        acciones={acciones(vi.fn(), alEliminar, "Del sistema: no se puede eliminar")}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Acciones" }));
    const eliminar = await screen.findByRole("button", { name: /Eliminar/ });
    expect(eliminar).toBeDisabled();
    expect(eliminar).toHaveTextContent("Del sistema: no se puede eliminar");
  });
});
