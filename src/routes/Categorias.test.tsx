import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { crearClienteConsultas } from "@/datos/consultas";
import { supabase } from "@/datos/supabase";
import { ponerMovil } from "@/test/setup";
import { Categorias } from "./Categorias";

// Filas como las devuelve Supabase: categorías activas y la vista uso_categorias.
const filas = [
  {
    id: "c1",
    nombre: "Alimentación",
    icono: "utensils",
    color: "#b45309",
    tipo: "gasto",
    clave_sistema: null,
    padre_id: null,
  },
  {
    id: "s1",
    nombre: "Mercado",
    icono: null,
    color: null,
    tipo: "gasto",
    clave_sistema: null,
    padre_id: "c1",
  },
  {
    id: "c2",
    nombre: "Gasto desconocido",
    icono: "circle-help",
    color: "#3c4a42",
    tipo: "gasto",
    clave_sistema: "gasto_desconocido",
    padre_id: null,
  },
  {
    id: "c3",
    nombre: "Salario",
    icono: "banknote",
    color: "#047857",
    tipo: "ingreso",
    clave_sistema: null,
    padre_id: null,
  },
];
const usos = [{ categoria_id: "c1", usos: 12 }];

const insert = vi.fn();
const update = vi.fn();
const rpc = vi.fn();

function falsoSupabase() {
  const resultado = <T,>(data: T) => Promise.resolve({ data, error: null });
  Object.assign(supabase, {
    from: vi.fn((tabla: string) => {
      if (tabla === "uso_categorias") return { select: () => resultado(usos) };
      return {
        select: () => ({ eq: () => resultado(filas) }),
        insert: (datos: unknown) => {
          insert(datos);
          const res = resultado(null);
          return Object.assign(res, {
            select: () => ({ single: () => resultado({ id: "nueva", tipo: "gasto" }) }),
          });
        },
        update: (datos: unknown) => ({
          eq: (_: string, id: string) => {
            update(datos, id);
            return resultado(null);
          },
        }),
      };
    }),
    rpc,
  });
}

function abrir(ruta = "/categorias") {
  const router = createMemoryRouter([{ path: "/categorias", Component: Categorias }], {
    initialEntries: [ruta],
  });
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.clearAllMocks();
  falsoSupabase();
});

describe("Categorías", () => {
  it("lista las del tipo elegido con subcategorías, movimientos y origen", async () => {
    abrir();
    const fila = (await screen.findByText("Alimentación")).closest("tr")!;
    expect(within(fila).getByText("Mercado")).toBeInTheDocument();
    expect(within(fila).getByText("12")).toBeInTheDocument();
    expect(within(fila).getByText("Propia")).toBeInTheDocument();
    expect(screen.getByText("Del sistema")).toBeInTheDocument();
    expect(screen.queryByText("Salario")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gasto · 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Ingreso · 1" })).toBeInTheDocument();
  });

  it("la pestaña sale de ?tipo= y un tipo sin categorías muestra el vacío", async () => {
    abrir("/categorias?tipo=deuda");
    expect(await screen.findByText("Aún no tienes categorías de este tipo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear categoría" })).toBeInTheDocument();
  });

  it("en el móvil muestra tarjetas con el número de movimientos", async () => {
    ponerMovil(true);
    abrir();
    expect(await screen.findByText("12 movimientos")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("una del sistema no se puede eliminar y lo dice", async () => {
    abrir();
    await screen.findByText("Gasto desconocido");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Acciones de «Gasto desconocido»" }), {
      button: 0,
      ctrlKey: false,
    });
    const eliminar = await screen.findByRole("menuitem", { name: /Eliminar/ });
    expect(eliminar).toHaveAttribute("aria-disabled", "true");
    expect(eliminar).toHaveTextContent("Del sistema: no se puede eliminar");
  });

  it("eliminar pide confirmación, explica qué se conserva y avisa si se archivó", async () => {
    rpc.mockResolvedValue({ data: "archivado", error: null });
    abrir();
    await screen.findByText("Alimentación");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Acciones de «Alimentación»" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialogo = await screen.findByRole("alertdialog", { name: "¿Borrar «Alimentación»?" });
    expect(dialogo).toHaveTextContent(/conserva su nombre/);
    expect(dialogo).toHaveTextContent("Sus subcategorías también se borran.");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Borrar categoría" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("eliminar_categoria", { p_id: "c1" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("crear valida el nombre, muestra la vista previa y guarda con sus subcategorías", async () => {
    abrir();
    await screen.findByText("Alimentación");
    fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nueva categoría" });

    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar categoría" }));
    expect(await within(dialogo).findByText("Escribe un nombre.")).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText("Nombre"), { target: { value: "Mascotas" } });
    expect(within(dialogo).getAllByText("Mascotas").length).toBeGreaterThan(0); // vista previa

    const sub = within(dialogo).getByLabelText("Nueva subcategoría");
    fireEvent.change(sub, { target: { value: "Veterinario" } });
    fireEvent.keyDown(sub, { key: "Enter" });
    fireEvent.change(sub, { target: { value: "veterinario " } });
    fireEvent.keyDown(sub, { key: "Enter" });
    expect(
      within(dialogo).getByText("Ya tiene una subcategoría con ese nombre."),
    ).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar categoría" }));
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(2));
    expect(insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ nombre: "Mascotas", tipo: "gasto" }),
    );
    expect(insert).toHaveBeenNthCalledWith(2, [
      { nombre: "Veterinario", tipo: "gasto", padre_id: "nueva" },
    ]);
  });

  it("agregar subcategoría desde el menú no repite nombres y hereda el tipo", async () => {
    abrir();
    await screen.findByText("Alimentación");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Acciones de «Alimentación»" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Agregar subcategoría" }));
    const dialogo = await screen.findByRole("dialog", {
      name: "Agregar subcategoría a «Alimentación»",
    });
    expect(dialogo).toHaveTextContent("Ya tiene: Mercado");
    const nombre = within(dialogo).getByLabelText("Nombre");
    fireEvent.change(nombre, { target: { value: "mercado" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar subcategoría" }));
    expect(
      await within(dialogo).findByText("Ya tiene una subcategoría con ese nombre."),
    ).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
    fireEvent.change(nombre, { target: { value: "Panadería" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Agregar subcategoría" }));
    await waitFor(() =>
      expect(insert).toHaveBeenCalledWith([{ nombre: "Panadería", tipo: "gasto", padre_id: "c1" }]),
    );
  });

  it("editar precarga los datos y quita una subcategoría al guardar", async () => {
    rpc.mockResolvedValue({ data: "eliminado", error: null });
    abrir();
    await screen.findByText("Alimentación");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Acciones de «Alimentación»" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar «Alimentación»" });
    expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("Alimentación");

    fireEvent.click(within(dialogo).getByRole("button", { name: "Quitar «Mercado»" }));
    expect(within(dialogo).getByText(/se archivan/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("eliminar_categoria", { p_id: "s1" }));
    expect(update).toHaveBeenCalledWith(
      { nombre: "Alimentación", icono: "utensils", color: "#b45309" },
      "c1",
    );
  });
});
