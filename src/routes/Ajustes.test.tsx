import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AuthError, type Session } from "@supabase/supabase-js";
import { supabase } from "@/datos/supabase";
import { SesionContext } from "@/features/auth/contexto";
import i18n from "@/i18n";
import { ponerMovil } from "@/test/setup";
import { crearRutas } from "./router";

const auth = vi.mocked(supabase.auth);
const sesionFalsa = { user: { id: "u1", email: "usuario-a@prueba.local" } } as Session;

// Como SesionProvider: al cerrar sesión, Supabase avisa y la sesión queda en null.
function abrir() {
  const router = createMemoryRouter(crearRutas(), { initialEntries: ["/", "/ajustes"] });
  function App() {
    const [sesion, setSesion] = useState<Session | null>(sesionFalsa);
    auth.signOut.mockImplementation(async () => {
      setSesion(null);
      return { error: null };
    });
    return (
      <SesionContext value={{ cargando: false, sesion, recuperando: false }}>
        <RouterProvider router={router} />
      </SesionContext>
    );
  }
  render(<App />);
  return router;
}

const titulo = () => screen.findByRole("heading", { level: 1, name: "Ajustes" });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Ajustes", () => {
  it("muestra el idioma actual, el correo de la cuenta y la versión", async () => {
    abrir();
    await titulo();
    expect(screen.getByRole("button", { name: /Idioma.*Español/ })).toBeInTheDocument();
    expect(screen.getByText("usuario-a@prueba.local")).toBeInTheDocument();
    expect(screen.getByText(__VERSION_APP__)).toBeInTheDocument();
  });

  it("cambia el idioma al guardar, sin recargar, y lo recuerda", async () => {
    abrir();
    await titulo();
    fireEvent.click(screen.getByRole("button", { name: /Idioma/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Idioma" });
    expect(within(dialogo).getByText(/pesos colombianos/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("radio", { name: "English" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("app-gastos.idioma")).toBe("en");
    await i18n.changeLanguage("es");
  });

  it("Cancelar deja el idioma como estaba", async () => {
    abrir();
    await titulo();
    fireEvent.click(screen.getByRole("button", { name: /Idioma/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Idioma" });
    fireEvent.click(within(dialogo).getByRole("radio", { name: "English" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(i18n.language).toBe("es");
    expect(localStorage.getItem("app-gastos.idioma")).toBeNull();
  });

  it("cerrar sesión pide confirmación y Cancelar no sale", async () => {
    abrir();
    await titulo();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const confirmar = await screen.findByRole("alertdialog", { name: "¿Cerrar sesión?" });
    fireEvent.click(within(confirmar).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("al confirmar, cierra la sesión de este dispositivo y reemplaza Ajustes por el login", async () => {
    const router = abrir();
    await titulo();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const confirmar = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirmar).getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("");
  });

  it("aunque el servidor falle, la sesión local ya se borró y se vuelve al login", async () => {
    const router = abrir();
    await titulo();
    const signOut = auth.signOut.getMockImplementation()!;
    auth.signOut.mockImplementationOnce(async (opciones) => {
      await signOut(opciones);
      return { error: new AuthError("falla") };
    });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const confirmar = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirmar).getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("");
  });

  it("en el móvil, el idioma se elige en una hoja inferior", async () => {
    ponerMovil(true);
    abrir();
    await titulo();
    fireEvent.click(screen.getByRole("button", { name: /Idioma/ }));
    const hoja = await screen.findByRole("dialog", { name: "Idioma" });
    expect(hoja).toHaveAttribute("data-slot", "drawer-content");
  });
});
